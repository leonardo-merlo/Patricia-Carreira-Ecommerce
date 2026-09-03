import type { Metadata } from "next"
import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  Leaf,
  CheckCircle,
} from "lucide-react"
import { AffiliateForm } from "@/components/store/affiliate-form"

export const metadata: Metadata = {
  title: "Clube de Afiliadas | Patrícia Carreira",
  description:
    "Você recebe um cupom e um link exclusivos, divulga as peças do seu jeito e ganha comissão pelas vendas. A gente cuida de estoque, embalagem e envio. Cadastre-se no Clube de Afiliadas Patrícia Carreira.",
}

function OrnamentalDivider({ light = false }: { light?: boolean }) {
  return (
    <div
      className={`my-6 flex items-center gap-3 ${light ? "text-[#8b5e3c]/50" : "text-white/25"}`}
    >
      <div className="h-px flex-1 bg-current" />
      <span className="text-xs leading-none">✦</span>
      <div className="h-px flex-1 bg-current" />
    </div>
  )
}

const STEPS: { num: string; text: ReactNode }[] = [
  {
    num: "01",
    text: (
      <>
        Você recebe seu <strong>cupom e seu link exclusivos</strong> para divulgar as peças.
      </>
    ),
  },
  {
    num: "02",
    text: (
      <>
        <strong>Divulga do seu jeito:</strong> nos stories, no feed, no grupo das amigas
        ou pessoalmente.
      </>
    ),
  },
  {
    num: "03",
    text: (
      <>
        Quando alguém compra usando seu cupom ou link,{" "}
        <strong>a venda fica registrada no seu nome.</strong>
      </>
    ),
  },
  {
    num: "04",
    text: (
      <>
        Você só divulga. <strong>Estoque, embalagem, envio e atendimento são com a
        gente.</strong>
      </>
    ),
  },
  {
    num: "05",
    text: (
      <>
        Você recebe <strong>comissão</strong> por cada venda registrada no seu cupom ou
        link. O valor a gente combina no WhatsApp, antes de você começar.
      </>
    ),
  },
]

export default function AfiliadasPage() {
  return (
    <div>
      {/* ── SEÇÃO 1 — HERO ─────────────────────────────────────────────────── */}
      <section className="relative flex min-h-[540px] flex-col overflow-hidden md:min-h-[740px]">
        <Image
          src="/images/refs2/hero-oficial.png"
          alt="Afiliadas Patrícia Carreira"
          fill
          className="object-cover object-[65%_center]"
          priority
        />
        {/* Mobile: overlay uniforme */}
        <div className="absolute inset-0 bg-black/50 md:hidden" />
        {/* Desktop: gradiente — opaco à esquerda (texto), quase transparente à direita (imagem) */}
        <div className="absolute inset-0 hidden bg-gradient-to-r from-stone-900/70 via-stone-900/5 to-transparent md:block" />

        {/* Conteúdo */}
        <div className="relative flex flex-1 flex-col justify-between px-margin-mobile py-24 md:px-margin-desktop">
          {/* Bloco principal — centralizado verticalmente */}
          <div className="flex flex-1 flex-col items-center justify-center text-center md:items-start md:text-left">
            <div className="max-w-2xl md:ml-28">
              {/* Ícone ornamental */}
              <Leaf className="mx-auto mb-4 h-6 w-6 text-[#ffba3d] md:mx-0" aria-hidden="true" />

              {/* Linha fina */}
              <div className="mx-auto mb-8 h-px w-16 bg-white/30 md:mx-0" />

              {/* Título */}
              <h1 className="font-display-lg text-on-surface">
                <span className="block text-4xl font-bold uppercase leading-tight tracking-wide text-white md:text-6xl">
                  VOCÊ INDICA,
                </span>
                <span className="block text-3xl italic font-medium leading-tight text-white/90 md:text-5xl">
                  a gente cuida do resto
                </span>
              </h1>

              {/* Parágrafo */}
              <p className="mx-auto mt-6 max-w-lg font-body-lg text-body-lg text-white/80 md:mx-0">
                Você recebe um cupom e um link só seus. Toda compra feita por eles fica
                registrada no seu nome e vira comissão.
              </p>

              {/* CTA */}
              <div className="mt-10 flex justify-center md:justify-start">
                <Link
                  href="#cadastro"
                  className="inline-flex items-center rounded bg-primary px-8 py-4 font-label-md text-label-md uppercase tracking-wider text-white transition-opacity hover:opacity-90"
                >
                  Preencher meu cadastro
                </Link>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── SEÇÃO 3 — COMO FUNCIONA ──────────────────────────────────────── */}
      <section className="overflow-hidden bg-[#f5ede0]">
        <div className="mx-auto max-w-container">
          <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr]">
            {/* Conteúdo */}
            <div className="px-margin-mobile py-20 md:px-12 md:py-24">
              <p className="mb-2 font-label-md text-label-md uppercase tracking-widest text-[#8b5e3c]">
                Passo a passo
              </p>
              <h2 className="font-headline-md text-headline-md font-bold uppercase text-on-surface">
                Como funciona
              </h2>
              <p className="mt-4 max-w-lg font-body-lg text-body-lg text-on-surface-variant">
                São cinco passos, do cadastro à primeira comissão.
              </p>

              <div className="mt-10">
                {STEPS.map(({ num, text }, i) => (
                  <div key={num}>
                    <div className="flex items-start gap-4 py-5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-on-surface">
                        <span className="text-[11px] font-bold text-white">{num}</span>
                      </div>
                      <p className="pt-1.5 font-body-lg text-body-lg text-on-surface-variant">
                        {text}
                      </p>
                    </div>
                    {i < STEPS.length - 1 && <div className="h-px bg-on-surface/10" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Imagem — somente desktop, encerra antes do final da seção */}
            <div className="relative hidden md:block">
              <div className="absolute inset-x-0 top-5 bottom-10 overflow-hidden rounded-xl">
                <Image
                  src="/images/refs2/afiliadas-comofunciona.jpeg"
                  alt="Como funciona o programa de afiliadas"
                  fill
                  className="object-cover object-[center_40%]"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SEÇÃO 4 — POR QUE FAZER PARTE? ──────────────────────────────── */}
      <section className="relative overflow-hidden">
        <Image
          src="/images/refs2/afiliadas-hero.png"
          alt="Por que ser afiliada Patrícia Carreira"
          fill
          className="object-cover object-[center_65%]"
        />
        {/* Gradient desktop: opaco à esquerda (texto), transparente à direita (imagem) */}
        <div className="absolute inset-0 hidden bg-gradient-to-r from-black/75 via-black/30 to-transparent md:block" />
        {/* Overlay sólido mobile */}
        <div className="absolute inset-0 bg-black/50 md:hidden" />

        {/* Conteúdo */}
        <div className="relative mx-auto max-w-container px-margin-mobile py-24 md:px-margin-desktop">
          <div className="max-w-xl">
            <p className="mb-3 font-label-md text-label-md uppercase tracking-widest text-[#ffba3d]">
              Benefícios
            </p>
            <h2 className="font-headline-md text-headline-md font-bold uppercase text-white">
              Por que fazer parte?
            </h2>

            <ul className="mt-10 space-y-4" aria-label="Lista de benefícios">
              {(
                [
                  <><strong>Comissão</strong> sobre cada venda sua</>,
                  <><strong>Cupom</strong> com o seu nome</>,
                  <><strong>Link exclusivo</strong> de divulgação</>,
                  <><strong>Acesso antecipado</strong> às coleções</>,
                  <>Convite para <strong>participar das campanhas</strong></>,
                  <><strong>Reposts</strong> nas redes da marca</>,
                  <><strong>Suporte da equipe</strong> sempre que precisar</>,
                  <><strong>Estoque, embalagem e envio</strong> por nossa conta</>,
                ] as ReactNode[]
              ).map((benefit, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle
                    className="mt-0.5 h-5 w-5 shrink-0 text-[#ffba3d]"
                    aria-hidden="true"
                  />
                  <span className="font-body-lg text-body-lg text-white/90">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── SEÇÃO 5 — FORMULÁRIO DE CADASTRO ─────────────────────────────── */}
      <section id="cadastro" className="bg-[#f5ede0]">
        <div className="mx-auto max-w-container px-margin-mobile py-20 md:px-margin-desktop">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-[45fr_55fr] md:items-start">
            {/* Coluna esquerda — texto */}
            <div className="pt-2">
              <Leaf className="mb-5 h-7 w-7 text-[#8b5e3c]" aria-hidden="true" />

              <p className="font-label-md text-label-md uppercase tracking-widest text-[#8b5e3c]">
                Cadastro
              </p>
              <h2 className="mt-3 font-headline-md text-headline-md font-bold text-on-surface">
                Faça parte do{" "}
                <span className="block italic text-primary">Clube de Afiliadas</span>
              </h2>

              <p className="mt-5 font-body-lg text-body-lg text-on-surface-variant">
                A Patrícia costura à mão há mais de 20 anos, de Minas Gerais até a loja em
                Arraial d&apos;Ajuda. Se você já mostra as peças para as suas amigas,{" "}
                <strong>o cupom é o próximo passo.</strong>
              </p>

              <OrnamentalDivider light />

              {/* Nota WhatsApp */}
              <div className="flex items-start gap-3 rounded-sm bg-white/60 px-4 py-4">
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="mt-0.5 h-5 w-5 shrink-0 text-[#25D366]"
                  aria-hidden="true"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Depois do cadastro, a gente chama no seu WhatsApp e explica as condições
                  da parceria.
                </p>
              </div>
            </div>

            {/* Coluna direita — formulário */}
            <AffiliateForm />
          </div>
        </div>
      </section>
    </div>
  )
}
