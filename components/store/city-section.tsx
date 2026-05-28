"use client"

import Image from "next/image"

type CityPhoto = { image: string; city: string }

const PHOTOS: CityPhoto[] = [
  { image: "/images/refs2/hero1-image.png", city: "Arraial D'Ajuda, BA" },
  { image: "/images/refs2/hero2-image.png", city: "Rio de Janeiro, RJ" },
  { image: "/images/refs2/hero3-image.png", city: "Florianópolis, SC" },
  { image: "/images/refs2/hero4-image.png", city: "Búzios, RJ" },
  { image: "/images/refs2/sobre-nos.jpeg", city: "Salvador, BA" },
  { image: "/images/refs2/loja-mulher1.jpeg", city: "São Paulo, SP" },
  { image: "/images/refs2/loja-criança.jpeg", city: "Curitiba, PR" },
  { image: "/images/refs2/loja-mulher2.jpeg", city: "Porto Alegre, RS" },
  { image: "/images/refs/arraial.jpg", city: "Arraial D'Ajuda, BA" },
  { image: "/images/refs3/bolsa-briana.jpeg", city: "Belo Horizonte, MG" },
  { image: "/images/refs3/bolsa-nirvana.jpeg", city: "Recife, PE" },
  { image: "/images/refs3/bolsa-romana.jpeg", city: "Fortaleza, CE" },
]

export function CitySection() {
  return (
    <section className="overflow-hidden bg-surface-container-low pt-8 pb-16">
      {/* Counter header */}
      <div className="px-margin-mobile text-center md:px-margin-desktop">
        <p className="font-display-lg text-[80px] font-bold leading-none text-on-surface md:text-[108px]">
          BRASIL
        </p>
        <h2 className="mt-2 font-headline-sm text-headline-sm uppercase tracking-widest text-primary">
          entregamos em todo o país
        </h2>
        <p className="mx-auto mt-4 max-w-md font-body-lg text-body-lg text-on-surface-variant">
          Peças nascidas em Minas Gerais, presentes de norte a sul do Brasil.
        </p>
      </div>

      {/* Infinite city carousel */}
      <div className="mt-10 overflow-hidden">
        <div className="animate-city-scroll flex" style={{ width: "max-content" }}>
          {[...PHOTOS, ...PHOTOS].map(({ image, city }, i) => (
            <div key={i} className="w-[200px] flex-shrink-0 px-2 md:w-[260px] md:px-3">
              <div className="relative aspect-[3/4] overflow-hidden rounded-lg">
                <Image
                  src={image}
                  alt={city}
                  fill
                  className="object-cover"
                  sizes="260px"
                />
              </div>
              <p className="mt-2 text-center font-label-md text-label-md text-on-surface-variant">
                {city}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
