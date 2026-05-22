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
    title: "Feito à mão",
    body: "Cada ponto, cada bordado e cada costura é feita manualmente. Não existe linha de produção — existe uma oficina com tempo e intenção.",
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
    <div className="mx-auto max-w-container px-margin-mobile py-16 md:px-margin-desktop">
      {/* Hero da página */}
      <div className="mx-auto max-w-2xl text-center">
        <p className="font-label-md text-label-md uppercase tracking-widest text-primary">
          Nossa História
        </p>
        <h1 className="mt-3 font-display-lg text-display-lg-mobile text-on-surface md:text-display-lg">
          Cada peça,{" "}
          <span className="italic text-primary">uma história.</span>
        </h1>
        <p className="mt-5 font-body-lg text-body-lg text-on-surface-variant">
          Patrícia Carreira nasceu da vontade de unir técnica e alma em cada ponto.
          Uma marca de moda artesanal criada em Minas Gerais — onde as mãos habilidosas
          e a tradição do bordado mineiro inspiram cada coleção.
        </p>
      </div>

      <Separator className="my-14" />

      {/* A origem */}
      <div className="mx-auto grid max-w-4xl grid-cols-1 gap-12 md:grid-cols-2 md:items-center">
        <div>
          <h2 className="font-headline-sm text-headline-sm text-on-surface">A origem</h2>
          <div className="mt-4 space-y-4 font-body-lg text-body-lg text-on-surface-variant">
            <p>
              Tudo começou com agulha, linha e a recusa em comprar o que todo mundo já tinha.
              Patrícia aprendeu a bordar com a avó, costurar com a mãe, e com o tempo
              transformou esse saber em arte — e a arte em profissão.
            </p>
            <p>
              O que era uma coleção pequena vendida pelo Instagram virou uma marca com
              identidade própria: peças que carregam a alma do artesanato mineiro e chegam
              até Arraial d&apos;Ajuda, BA — e a mais de 23 cidades em todo o Brasil.
            </p>
          </div>
        </div>

        <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
          <Image
            src="/images/refs/otoquedotempoimage.png"
            alt="O Toque do Tempo — Patrícia Carreira"
            fill
            className="object-cover"
          />
        </div>
      </div>

      <Separator className="my-14" />

      {/* Valores */}
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-10 text-center font-headline-sm text-headline-sm text-on-surface">
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
      </div>

      <Separator className="my-14" />

      {/* Arraial d&apos;Ajuda */}
      <div className="mx-auto grid max-w-4xl grid-cols-1 gap-12 md:grid-cols-2 md:items-center">
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl order-last md:order-first">
          <Image
            src="/images/refs/arraial.jpg"
            alt="Arraial d'Ajuda, BA"
            fill
            className="object-cover"
          />
        </div>

        <div>
          <h2 className="font-headline-sm text-headline-sm text-on-surface">
            Arraial d&apos;Ajuda, BA
          </h2>
          <div className="mt-4 space-y-4 font-body-lg text-body-lg text-on-surface-variant">
            <p>
              Nossa loja fica em Arraial d&apos;Ajuda — um dos destinos mais encantadores
              da Bahia. A beleza local inspira cada coleção: as cores vibrantes,
              a leveza do litoral baiano, a energia de quem vive com autenticidade.
            </p>
            <p>
              As peças são criadas em Minas Gerais e chegam até Arraial d&apos;Ajuda carregando
              o melhor dos dois mundos: a tradição artesanal mineira e o espírito livre do nordeste.
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}
