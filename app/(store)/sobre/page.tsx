import type { Metadata } from "next"
import Image from "next/image"
import { Separator } from "@/components/ui/separator"

export const metadata: Metadata = {
  title: "Nossa História | Patrícia Carreira",
  description:
    "Bordado à mão há mais de 20 anos. A marca nasceu em Minas, tem loja em Arraial d'Ajuda desde 2005 e envia para todo o Brasil.",
}

const VALUES = [
  {
    title: "Design autoral",
    body: "Os desenhos são da Patrícia. Bordado de Minas com pegada asiática e traços de arte tribal, riscados antes de virar peça.",
  },
  {
    title: "Materiais naturais",
    body: "Linho rústico, algodão cru, couro vegetal. Escolhemos materiais que envelhecem bem, que respiram e que respeitam quem os usa.",
  },
  {
    title: "Peças únicas",
    body: "O bordado nunca sai igual. Duas bolsas da mesma cor têm diferenças de milímetros. Quem repara nisso costuma ser quem mais gosta.",
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
            Feito à mão,{" "}
            <span className="italic text-primary">uma de cada vez.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl font-body-lg text-body-lg text-on-surface-variant">
            Bordamos à mão, peça por peça, há mais de 20 anos. É trabalho lento e
            colorido, e dá gosto de ver pronto. A marca nasceu em Minas, ganhou
            casa em Arraial d&apos;Ajuda e hoje chega ao Brasil inteiro.
          </p>
        </div>
      </section>

      <Separator />

      {/* Nossa Essência */}
      <section className="mx-auto max-w-container px-margin-mobile py-14 md:px-margin-desktop">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="font-headline-md text-headline-md font-bold uppercase text-on-surface">
              Como começou
            </h2>
            <div className="mt-4 space-y-4 font-body-lg text-body-lg text-on-surface-variant">
              <p>
                Começou por acaso. A Patrícia era dentista e costurava por gosto, nas horas vagas. O hobby foi tomando espaço até não caber mais como hobby.
              </p>
              <p>
                Do desenho ao último ponto do bordado, a peça passa por mão humana em todas as etapas.
              </p>
              <p>
                Nossas criações remetem aos bordados de Minas com uma pegada asiática e inspirações em artes tribais. Sai colorido, e sai diferente do resto.
              </p>
              <p>
                São mais de 20 anos fazendo assim, à mão, no tempo que a peça pede.
              </p>
              <p>
                Não dá para fazer isso com pressa, e a gente não tenta.
              </p>
              <p className="font-semibold text-on-surface">
                Se a peça chegar na sua casa e você quiser usar no mesmo dia, a gente fez certo.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <span className="rounded-full border border-primary px-4 py-1.5 font-label-md text-label-md uppercase tracking-wider text-primary">
                Bordado à mão
              </span>
              <span className="rounded-full border border-primary px-4 py-1.5 font-label-md text-label-md uppercase tracking-wider text-primary">
                Desenho da Patrícia
              </span>
              <span className="rounded-full border border-primary px-4 py-1.5 font-label-md text-label-md uppercase tracking-wider text-primary">
                Mais de 20 anos
              </span>
            </div>
            <p className="mt-6 font-body-lg text-body-lg italic text-on-surface-variant">
              Patrícia Carreira ♡
            </p>
          </div>

          <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
            <Image
              src="/images/refs/otoquedotempoimage.png"
              alt="Peças bordadas à mão da Patrícia Carreira"
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
              Foi entre as ruas coloridas e a gente de todo canto que passa por aqui
              que <strong>a marca ganhou o jeito que tem hoje.</strong>
            </p>
            <p>
              Arraial é assim: <strong>gente do mundo todo</strong>, muita cor e pouca pressa.
            </p>
            <p>
              Por mais de 10 anos a marca também teve presença em Búzios, no Rio. Hoje,
              quem não passa por Arraial compra pelo site, e{" "}
              <strong>a gente manda para todo o Brasil.</strong>
            </p>
            <p><strong>É de Arraial que vem o jeito da marca: cor sem medo e bordado à mão.</strong></p>
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
