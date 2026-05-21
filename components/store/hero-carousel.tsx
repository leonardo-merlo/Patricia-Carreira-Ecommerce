"use client" // needs useState for current slide + useEffect for auto-advance

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

const SLIDES = [
  {
    id: 1,
    image: "/images/products/imagens/bolsa_mandala_mostarda_0.jpeg",
    heading: "Moda artesanal,",
    headingAccent: "feita para durar.",
    body: "Bolsas, vestidos e batas confeccionados à mão em Minas Gerais.",
    cta: { label: "Ver Coleção", href: "/bolsas" },
  },
  {
    id: 2,
    image: "/images/products/imagens/bolsa_briana_vermelha_0.jpeg",
    heading: "Peças especiais",
    headingAccent: "com preços únicos.",
    body: "Seleção especial de peças do bazar — oportunidades únicas, enquanto durar o estoque.",
    cta: { label: "Visitar o Bazar", href: "/bazar" },
  },
  {
    id: 3,
    image: "/images/products/imagens/produto_pagina_57_vestido_fiji_0.jpeg",
    heading: "Vestidos e batas",
    headingAccent: "cheios de alma.",
    body: "Peças únicas com bordado artesanal inspirado na natureza e nas raízes mineiras.",
    cta: { label: "Ver Vestidos", href: "/vestidos" },
  },
] as const

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
    const id = setInterval(next, 5000)
    return () => clearInterval(id)
  }, [next, paused])

  const slide = SLIDES[current]

  return (
    <section
      className="relative flex min-h-[540px] flex-col items-center justify-center overflow-hidden text-center md:min-h-[700px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Background image */}
      <div className="absolute inset-0">
        <Image
          key={slide.id}
          src={slide.image}
          alt=""
          fill
          className="object-cover"
          priority={current === 0}
          aria-hidden
        />
        {/* Dark overlay for text legibility */}
        <div className="absolute inset-0 bg-black/55" />
      </div>

      {/* Content — rendered first in DOM so arrows sit on top */}
      <div className="relative z-10 mx-auto w-full max-w-container px-16 md:px-margin-desktop">
        <h1 className="font-display-lg text-display-lg-mobile text-white md:text-display-lg">
          {slide.heading}
          <br />
          <span className="italic text-amber-300">{slide.headingAccent}</span>
        </h1>
        <p className="mx-auto mt-5 max-w-md font-body-lg text-body-lg text-white/80">
          {slide.body}
        </p>
        <div className="mt-8">
          <Button asChild size="lg">
            <Link href={slide.cta.href}>{slide.cta.label}</Link>
          </Button>
        </div>
      </div>

      {/* Dot indicators */}
      <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setCurrent(i)}
            aria-label={`Ir para slide ${i + 1}`}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === current
                ? "w-6 bg-white"
                : "w-2 bg-white/40 hover:bg-white/70"
            }`}
          />
        ))}
      </div>

      {/* Prev arrow — z-20 to sit above content */}
      <button
        onClick={prev}
        aria-label="Slide anterior"
        className="absolute left-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white/80 transition-colors hover:bg-black/50 hover:text-white md:left-5 md:h-12 md:w-12"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>

      {/* Next arrow — z-20 to sit above content */}
      <button
        onClick={next}
        aria-label="Próximo slide"
        className="absolute right-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white/80 transition-colors hover:bg-black/50 hover:text-white md:right-5 md:h-12 md:w-12"
      >
        <ChevronRight className="h-6 w-6" />
      </button>
    </section>
  )
}
