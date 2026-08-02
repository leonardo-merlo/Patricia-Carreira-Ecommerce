import type { Metadata } from "next"
import Image from "next/image"
import { Separator } from "@/components/ui/separator"

export const metadata: Metadata = {
  title: "Nossa História | Patrícia Carreira",
  description:
    "Conheça a história por trás de cada peça: moda artesanal feita à mão em Minas Gerais e presente em todo o Brasil.",
}

const VALUES = [
  {
    title: "Design autoral",
    body: "Cada coleção nasce de desenhos exclusivos criados pela Patrícia — bordados, estampas e formas que carregam identidade e não se repetem em lugar nenhum.",
  },
  {
    title: "Materiais naturais",
    body: "Linho rústico, algodão cru, couro vegetal. Escolhemos materiais que envelhecem bem, que respiram e que respeitam quem os usa.",
  },
  {
    title: "Peças únicas",
    body: "O bordado nunca sai igual. A trama do linho muda de peça para peça. Isso não é defeito — é a assinatura do artesanato.",
  },
]

export default function SobrePage() {
  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-container px-margin-mobile py-16 md:px-margin-desktop">
        <div className="text-center">
          <p className="font-label-md text-label-md uppercase tracking-widest text-primary">
            Nossa História
          </p>
          <h1 className="mt-3 font-display-lg text-display-lg-mobile text-on-surface md:text-display-lg">
            Cada peça,{" "}
            <span className="italic text-primary">uma história.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl font-body-lg text-body-lg text-on-surface-variant">
            Patrícia Carreira nasceu da vontade de unir técnica e alma em cada ponto.
            Uma marca de moda artesanal criada em Minas Gerais — onde as mãos habilidosas
            e a tradição do bordado mineiro inspiram cada coleção.
          </p>
        </div>
      </section>

      <Separator />

      {/* Nossa Essência */}
      <section className="mx-auto max-w-container px-margin-mobile py-14 md:px-margin-desktop">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="font-headline-md text-headline-md font-bold uppercase text-on-surface">
              Nossa Essência
            </h2>
            <div className="mt-4 space-y-4 font-body-lg text-body-lg text-on-surface-variant">
              <p>
                Mais do que vestir, acreditamos em criar peças com história.
              </p>
              <p>
                Tudo começou por acaso, quando a dentista Patrícia se viu presa por sua alma de estilista. O que começou como um hobby, aos poucos foi se transformando numa marca cheia de arte e personalidade.
              </p>
              <p>
                Cada peça nasce da mistura entre matéria-prima selecionada, desenhos autorais e o cuidado artesanal presente em cada detalhe.
              </p>
              <p>
                Nossas criações remetem aos bordados de Minas com uma pegada asiática e inspirações em artes tribais, trazendo um estilo leve, colorido e cheio de identidade.
              </p>
              <p>
                Há mais de 20 anos desenvolvemos peças que valorizam o feito à mão, o tempo do processo e a beleza das imperfeições que tornam cada criação única e especial.
              </p>
              <p>
                Tudo aqui é feito com amor, inspiração e boas energias. Acreditamos que quando colocamos alma em cada criação, isso se transforma em algo que vai muito além do visual: transmite sentimento, conexão e autenticidade.
              </p>
              <p className="font-semibold text-on-surface">
                Mais que peças, entregamos energia, arte e essência.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <span className="rounded-full border border-primary px-4 py-1.5 font-label-md text-label-md uppercase tracking-wider text-primary">
                Feito com Amor
              </span>
              <span className="rounded-full border border-primary px-4 py-1.5 font-label-md text-label-md uppercase tracking-wider text-primary">
                Arte que Conecta
              </span>
              <span className="rounded-full border border-primary px-4 py-1.5 font-label-md text-label-md uppercase tracking-wider text-primary">
                Energia que Transforma
              </span>
            </div>
            <p className="mt-6 font-body-lg text-body-lg italic text-on-surface-variant">
              Patrícia Carreira ♡
            </p>
          </div>

          <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
            <Image
              src="/images/refs/otoquedotempoimage.png"
              alt="Nossa Essência — Patrícia Carreira"
              fill
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <Separator />

      {/* Valores */}
      <section className="mx-auto max-w-container px-margin-mobile py-14 md:px-margin-desktop">
        <h2 className="mb-10 text-center font-headline-md text-headline-md font-bold uppercase text-on-surface">
          O que acreditamos
        </h2>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {VALUES.map(({ title, body }) => (
            <div key={title} className="rounded-xl bg-surface-container-low p-6">
              <p className="font-headline-sm text-headline-sm text-primary">{title}</p>
              <p className="mt-3 font-body-md text-body-md text-on-surface-variant">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <Separator />

      {/* Entre Arraial e O Mundo — full bleed */}
      <section>
        {/* Foto da loja */}
        <div className="relative h-[55vh] w-full overflow-hidden md:h-[72vh]">
          <Image
            src="/images/refs2/loja-loja.png"
            alt="Loja Patrícia Carreira em Arraial d'Ajuda"
            fill
            className="object-cover object-center"
            priority
          />
        </div>

        {/* Texto centralizado */}
        <div className="mx-auto max-w-container px-margin-mobile py-14 text-center md:px-margin-desktop">
          <h2>
            <span className="block font-display-lg text-4xl font-bold uppercase leading-tight text-on-surface md:text-5xl">
              Entre
            </span>
            <span className="block font-display-lg text-4xl font-bold uppercase leading-tight text-primary md:text-5xl">
              Arraial e o Mundo
            </span>
          </h2>
          <div className="mx-auto mt-6 max-w-2xl space-y-4 font-body-lg text-body-lg text-on-surface-variant">
            <p><strong>Desde 2005, Arraial d&apos;Ajuda - BA faz parte da nossa história.</strong></p>
            <p>
              Foi entre ruas coloridas, arte, natureza e encontros especiais com pessoas de
              diferentes culturas que <strong>nossa identidade ganhou forma.</strong>
            </p>
            <p>
              Arraial é <strong>um lugar mágico</strong>, repleto de pessoas incríveis, liberdade, inspiração e
              uma energia leve, criativa e cheia de vida.
            </p>
            <p>
              Durante mais de 10 anos, nossa marca também esteve presente em Búzios - RJ, levando
              essa mesma essência para diferentes destinos e{" "}
              <strong>conectando nossas criações a mulheres do mundo inteiro.</strong>
            </p>
            <p><strong>Mais do que moda, criamos peças que carregam história, identidade e conexão.</strong></p>
          </div>
        </div>

        {/* Três fotos lado a lado — sem padding, de borda a borda */}
        <div className="grid grid-cols-3 gap-[3px] bg-white">
          <div className="relative aspect-[9/16] md:aspect-[4/3]">
            <Image
              src="/images/refs2/loja-mulher1.jpeg"
              alt="Loja Patrícia Carreira"
              fill
              className="object-cover object-[50%_10%]"
            />
          </div>
          <div className="relative aspect-[9/16] md:aspect-[4/3]">
            <Image
              src="/images/refs2/loja-criança.jpeg"
              alt="Criança na loja Patrícia Carreira"
              fill
              className="object-cover object-[50%_35%]"
            />
          </div>
          <div className="relative aspect-[9/16] md:aspect-[4/3]">
            <Image
              src="/images/refs2/loja-mulher2.jpeg"
              alt="Loja Patrícia Carreira"
              fill
              className="object-cover object-center"
            />
          </div>
        </div>

        {/* Faixa escura com endereço */}
        <div className="bg-neutral-900 py-5 text-center">
          <p className="font-label-md text-label-md uppercase tracking-widest text-white">
            ARRAIAL D&apos;AJUDA • BAHIA • RUA MUCUGÊ, 118
          </p>
        </div>
      </section>
    </div>
  )
}
