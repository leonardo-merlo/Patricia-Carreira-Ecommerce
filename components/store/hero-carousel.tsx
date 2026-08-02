"use client" // needs useState for current slide + useEffect for auto-advance

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

type Slide = {
  id: number
  image: string
  imagePosition?: string
  heading: string[]
  body: string
  cta: { label: string; href: string }
}

const SLIDES: Slide[] = [
  {
    id: 1,
    image: "/images/refs2/hero1-image.png",
    imagePosition: "72% 15%",
    heading: ["IDENTIDADE"],
    body: "Peças autorais com bordados exclusivos para quem carrega a beleza, autenticidade e a leveza de viver a arte no cotidiano",
    cta: { label: "CONHEÇA A COLEÇÃO", href: "/lancamentos" },
  },
  {
    id: 2,
    image: "/images/refs2/hero2-image.png",
    imagePosition: "50% 75%",
    heading: ["ARTE", "EM CADA", "DETALHE"],
    body: "Bolsas produzidas em lona, couro legítimo e desenhos autorais aplicados através do bordado.",
    cta: { label: "VER BOLSAS", href: "/bolsas" },
  },
  {
    id: 3,
    image: "/images/refs2/hero3-image.png",
    heading: ["PEQUENAS", "CHEIAS DE ARTE"],
    body: "Peças leves, coloridas e bordadas para acompanhar a infância com conforto e personalidade.",
    cta: { label: "CONHECER", href: "/infantil" },
  },
  {
    id: 4,
    image: "/images/refs2/hero4-image.png",
    imagePosition: "50% 30%",
    heading: ["SEJA UMA", "AFILIADA"],
    body: "Crie conteúdo com nossas peças, compartilhe seu cupom exclusivo e receba comissões pelas vendas realizadas através da sua divulgação",
    cta: { label: "SAIBA MAIS", href: "https://wa.me/5522988223993?text=Olá!%20Quero%20saber%20mais%20sobre%20o%20programa%20de%20afiliadas." },
  },
]

export function HeroCarousel() {
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)

  const prev = useCallback(() => {
    setCurrent((c) => (c === 0 ? SLIDES.length - 1 : c - 1))
  }, [])

  const next = useCallback(() => {
    setCurrent((c) => (c === SLIDES.length - 1 ? 0 : c + 1))
  }, [])

  useEffect(() => {
    if (paused) return
    const id = setInterval(next, 8000)
    return () => clearInterval(id)
  }, [next, paused])

  const slide = SLIDES[current]

  return (
    <section onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>

      {/* ─── Mobile layout: texto sobreposto à imagem, centralizado ─── */}
      <div className="md:hidden">
        <div className="relative h-[390px] overflow-hidden">
          <div key={`bg-mobile-${slide.id}`} className="absolute inset-0 animate-carousel-fade">
            <Image
              src={slide.image}
              alt=""
              fill
              className="scale-110 object-cover"
              style={{ objectPosition: slide.imagePosition ?? "center" }}
              priority={current === 0}
              aria-hidden
            />
          </div>

          {/* Camada escura para o texto branco se destacar */}
          <div className="absolute inset-0 bg-black/40" />

          {/* Bloco de texto centralizado */}
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-12 text-center">
            <h1
              key={`heading-mobile-${slide.id}`}
              className="animate-carousel-fade font-display-lg text-[26px] font-normal leading-[1.05] tracking-[0.02em] text-white"
            >
              {slide.heading.map((line, i) => (
                <span key={i} className="block">{line}</span>
              ))}
            </h1>

            <div className="my-3 flex items-center gap-3">
              <div className="h-px w-14 bg-white/50" />
              <div className="h-[5px] w-[5px] rotate-45 bg-white/50" />
              <div className="h-px w-14 bg-white/50" />
            </div>

            <p
              key={`body-mobile-${slide.id}`}
              className="animate-carousel-fade w-full text-[13px] leading-relaxed font-semibold text-white/90"
            >
              {slide.body}
            </p>

            <div className="mt-5">
              <Link
                href={slide.cta.href}
                className="inline-block rounded-[30px] bg-[#7a3a22] px-6 py-2 font-label-md text-xs uppercase tracking-widest text-white transition-colors hover:bg-[#5f2c17]"
              >
                {slide.cta.label}
              </Link>
            </div>
          </div>

          {/* Pontos indicadores */}
          <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
            {SLIDES.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setCurrent(i)}
                aria-label={`Ir para slide ${i + 1}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === current
                    ? "w-6 bg-white"
                    : "w-2 bg-white/60 hover:bg-white/90"
                }`}
              />
            ))}
          </div>

          {/* Setas */}
          <button
            onClick={prev}
            aria-label="Slide anterior"
            className="absolute left-1 top-1/2 z-20 -translate-y-1/2"
          >
            <span
              className="flex items-center justify-center rounded-full bg-white/70 text-[#3d1f0e]/80 shadow transition-colors hover:bg-white/90"
              style={{ width: 36, height: 36 }}
            >
              <ChevronLeft className="h-5 w-5" />
            </span>
          </button>
          <button
            onClick={next}
            aria-label="Próximo slide"
            className="absolute right-1 top-1/2 z-20 -translate-y-1/2"
          >
            <span
              className="flex items-center justify-center rounded-full bg-white/70 text-[#3d1f0e]/80 shadow transition-colors hover:bg-white/90"
              style={{ width: 36, height: 36 }}
            >
              <ChevronRight className="h-5 w-5" />
            </span>
          </button>
        </div>
      </div>

      {/* ─── Desktop layout: imagem de fundo com texto sobreposto (original) ─── */}
      <div className="relative hidden flex-col justify-center overflow-hidden md:flex md:min-h-[560px] lg:min-h-[640px] xl:min-h-[740px]">
        {/* Imagem de fundo */}
        <div key={`bg-${slide.id}`} className="absolute inset-0 animate-carousel-fade">
          <Image
            src={slide.image}
            alt=""
            fill
            className="object-cover"
            style={{ objectPosition: slide.imagePosition ?? "center" }}
            priority={current === 0}
            aria-hidden
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white/60 via-white/20 to-transparent" />
        </div>

        {/* Conteúdo */}
        <div key={`content-${slide.id}`} className="relative z-10 w-full animate-carousel-fade px-margin-desktop">
          <div className="max-w-[380px] lg:ml-12 lg:max-w-[480px] xl:ml-28 xl:max-w-[600px]">
            <h1 className="font-display-lg text-[46px] font-normal leading-[1.05] tracking-[0.02em] text-[#3d1f0e] lg:text-[62px] xl:text-[86px]">
              {slide.heading.map((line, i) => (
                <span key={i} className="block">{line}</span>
              ))}
            </h1>

            <div className="my-4 flex items-center gap-3 xl:my-5">
              <div className="h-px w-10 bg-[#3d1f0e]/45 lg:w-12 xl:w-14" />
              <div className="h-[5px] w-[5px] rotate-45 bg-[#3d1f0e]/45" />
              <div className="h-px w-10 bg-[#3d1f0e]/45 lg:w-12 xl:w-14" />
            </div>

            <p className="max-w-[300px] text-[13px] leading-relaxed font-semibold text-[#3d1f0e]/75 lg:max-w-[380px] lg:text-[16px] xl:max-w-[490px] xl:text-[20px]">
              {slide.body}
            </p>

            <div className="mt-6 xl:mt-8">
              <Link
                href={slide.cta.href}
                className="inline-block rounded-[30px] bg-[#7a3a22] px-6 py-2.5 font-label-md text-xs uppercase tracking-widest text-white transition-colors hover:bg-[#5f2c17] lg:px-7 lg:py-3 lg:text-sm xl:px-8"
              >
                {slide.cta.label}
              </Link>
            </div>
          </div>
        </div>

        {/* Pontos indicadores */}
        <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setCurrent(i)}
              aria-label={`Ir para slide ${i + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === current
                  ? "w-6 bg-[#3d1f0e]"
                  : "w-2 bg-[#3d1f0e]/30 hover:bg-[#3d1f0e]/60"
              }`}
            />
          ))}
        </div>

        {/* Seta esquerda */}
        <button
          onClick={prev}
          aria-label="Slide anterior"
          className="absolute left-5 top-1/2 z-20 -translate-y-1/2"
        >
          <span
            className="flex items-center justify-center rounded-full bg-white/70 text-[#3d1f0e]/80 shadow transition-colors hover:bg-white/90 hover:text-[#3d1f0e]"
            style={{ width: 44, height: 44 }}
          >
            <ChevronLeft className="h-6 w-6" />
          </span>
        </button>

        {/* Seta direita */}
        <button
          onClick={next}
          aria-label="Próximo slide"
          className="absolute right-5 top-1/2 z-20 -translate-y-1/2"
        >
          <span
            className="flex items-center justify-center rounded-full bg-white/70 text-[#3d1f0e]/80 shadow transition-colors hover:bg-white/90 hover:text-[#3d1f0e]"
            style={{ width: 44, height: 44 }}
          >
            <ChevronRight className="h-6 w-6" />
          </span>
        </button>
      </div>
    </section>
  )
}
