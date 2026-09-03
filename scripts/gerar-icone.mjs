import { readFileSync, writeFileSync } from 'node:fs'
import zlib from 'node:zlib'

const SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

function parse(buf) {
  if (!buf.subarray(0, 8).equals(SIG)) throw new Error('não é PNG')
  let off = 8
  let ihdr = null
  const idat = []
  while (off < buf.length) {
    const len = buf.readUInt32BE(off)
    const type = buf.toString('ascii', off + 4, off + 8)
    const data = buf.subarray(off + 8, off + 8 + len)
    if (type === 'IHDR') {
      ihdr = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data[8],
        colorType: data[9],
        interlace: data[12],
      }
    } else if (type === 'IDAT') idat.push(data)
    else if (type === 'IEND') break
    off += 12 + len
  }
  return { ihdr, idat: Buffer.concat(idat) }
}

function paeth(a, b, c) {
  const p = a + b - c
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c
}

function unfilter(raw, width, height, bpp) {
  const stride = width * bpp
  const out = Buffer.alloc(stride * height)
  let pos = 0
  for (let y = 0; y < height; y++) {
    const filter = raw[pos++]
    const row = out.subarray(y * stride, (y + 1) * stride)
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null
    for (let x = 0; x < stride; x++) {
      const cur = raw[pos + x]
      const a = x >= bpp ? row[x - bpp] : 0
      const b = prev ? prev[x] : 0
      const c = prev && x >= bpp ? prev[x - bpp] : 0
      let v
      if (filter === 0) v = cur
      else if (filter === 1) v = cur + a
      else if (filter === 2) v = cur + b
      else if (filter === 3) v = cur + ((a + b) >> 1)
      else if (filter === 4) v = cur + paeth(a, b, c)
      else throw new Error('filtro ' + filter)
      row[x] = v & 0xff
    }
    pos += stride
  }
  return out
}

// Média de caixa com alfa como peso: sem isso, pixels transparentes (que no
// PNG guardam RGB lixo) sujam a borda do ícone reduzido.
function downscale(src, sw, sh, dw, dh) {
  const dst = Buffer.alloc(dw * dh * 4)
  const fx = sw / dw, fy = sh / dh
  for (let y = 0; y < dh; y++) {
    const y0 = Math.floor(y * fy), y1 = Math.max(y0 + 1, Math.floor((y + 1) * fy))
    for (let x = 0; x < dw; x++) {
      const x0 = Math.floor(x * fx), x1 = Math.max(x0 + 1, Math.floor((x + 1) * fx))
      let r = 0, g = 0, b = 0, a = 0, aw = 0, n = 0
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const i = (sy * sw + sx) * 4
          const al = src[i + 3]
          r += src[i] * al; g += src[i + 1] * al; b += src[i + 2] * al
          aw += al; a += al; n++
        }
      }
      const o = (y * dw + x) * 4
      dst[o] = aw ? Math.round(r / aw) : 0
      dst[o + 1] = aw ? Math.round(g / aw) : 0
      dst[o + 2] = aw ? Math.round(b / aw) : 0
      dst[o + 3] = Math.round(a / n)
    }
  }
  return dst
}

const CRC = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return (buf) => {
    let c = -1
    for (let i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
    return (c ^ -1) >>> 0
  }
})()

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(CRC(body))
  return Buffer.concat([len, body, crc])
}

function encode(px, w, h) {
  const stride = w * 4
  const raw = Buffer.alloc((stride + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0
    px.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  return Buffer.concat([
    SIG,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const [, , inPath, outPath, sizeArg, bgArg] = process.argv
const size = Number(sizeArg)
const buf = readFileSync(inPath)
const { ihdr, idat } = parse(buf)
if (ihdr.bitDepth !== 8 || ihdr.colorType !== 6 || ihdr.interlace !== 0) {
  throw new Error(`esperado 8-bit RGBA não entrelaçado, veio ${JSON.stringify(ihdr)}`)
}
const px = unfilter(zlib.inflateSync(idat), ihdr.width, ihdr.height, 4)
const small = downscale(px, ihdr.width, ihdr.height, size, size)
// Compõe sobre uma cor sólida: o logo é traço preto sobre transparência e
// sumia na barra de abas escura do Chrome.
if (bgArg) {
  const br = parseInt(bgArg.slice(1, 3), 16)
  const bg = parseInt(bgArg.slice(3, 5), 16)
  const bb = parseInt(bgArg.slice(5, 7), 16)
  for (let i = 0; i < small.length; i += 4) {
    const a = small[i + 3] / 255
    small[i] = Math.round(small[i] * a + br * (1 - a))
    small[i + 1] = Math.round(small[i + 1] * a + bg * (1 - a))
    small[i + 2] = Math.round(small[i + 2] * a + bb * (1 - a))
    small[i + 3] = 255
  }
}
const out = encode(small, size, size)
writeFileSync(outPath, out)
console.log(`${ihdr.width}x${ihdr.height} (${(buf.length / 1024).toFixed(0)} KB) -> ${size}x${size} (${(out.length / 1024).toFixed(1)} KB)`)

// Uso:
//   node scripts/gerar-icone.mjs public/images/logo/logo-v2.png app/icon.png 64 '#fff8ef'
//   node scripts/gerar-icone.mjs public/images/logo/logo-v2.png app/apple-icon.png 180 '#fff8ef'
//
// Existe porque o projeto não tem sharp e o app/icon.tsx que gerava o ícone em
// tempo de execução com @vercel/og quebrava o build: o runtime Node do @vercel/og
// chama fileURLToPath no caminho do projeto, e este caminho tem espaço
// ("Patricia Carreira"). Ícone estático não corre esse risco.
