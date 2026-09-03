import Image from "next/image"

/**
 * Selos de confiança do checkout.
 *
 * Regra desta tela: nenhuma requisição para fora. Não importar imagem de CDN,
 * de host de terceiro nem marca baixada da web — o que está aqui é desenho
 * próprio, genérico de propósito (QR, cartão, código de barras), e serve de
 * lugar-guardado até chegarem as artes oficiais.
 *
 * ── Como trocar pelas artes oficiais ──────────────────────────────────────────
 * 1. Baixe o material no kit de marca de cada um:
 *    - PIX      → Banco Central, "Marca Pix" (bcb.gov.br)
 *    - Mercado Pago → kit de marca / selos de checkout do próprio Mercado Pago
 *    Boleto e "cartão" não têm marca própria: continuam com o desenho genérico,
 *    porque selo de bandeira que a loja não aceita é pior que selo nenhum.
 * 2. Salve o arquivo em `public/images/pagamento/` (ex.: `pix.svg`).
 * 3. Preencha `officialSrc` do item correspondente com o caminho a partir da
 *    raiz pública (ex.: `"/images/pagamento/pix.svg"`).
 * O desenho inline some sozinho assim que `officialSrc` deixa de ser null —
 * trocar de arte é substituir arquivo, não mexer em JSX.
 *
 * Só entram aqui os meios que a loja realmente aceita: PIX, cartão e boleto,
 * os mesmos três de PAYMENT_OPTIONS em app/(store)/checkout/page.tsx.
 */

type PaymentMark = {
  id: "pix" | "credit_card" | "boleto"
  label: string
  hint: string
  /** Caminho em /public para a arte oficial. null = usa o desenho inline. */
  officialSrc: string | null
  mark: React.ReactNode
}

const MARK_SIZE = { width: 28, height: 20 }

const PAYMENT_MARKS: PaymentMark[] = [
  {
    id: "pix",
    label: "PIX",
    hint: "Aprovação imediata",
    officialSrc: null,
    mark: (
      <svg viewBox="0 0 28 20" width={MARK_SIZE.width} height={MARK_SIZE.height} fill="none" aria-hidden="true">
        <rect x="4.5" y="2.5" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4" />
        <rect x="17.5" y="2.5" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4" />
        <rect x="4.5" y="11.5" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4" />
        <rect x="17.5" y="11.5" width="2.5" height="2.5" rx="0.6" fill="currentColor" />
        <rect x="21.5" y="15.5" width="2" height="2" rx="0.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "credit_card",
    label: "Cartão",
    hint: "Em até 6x sem juros",
    officialSrc: null,
    mark: (
      <svg viewBox="0 0 28 20" width={MARK_SIZE.width} height={MARK_SIZE.height} fill="none" aria-hidden="true">
        <rect x="2.5" y="3.5" width="23" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M2.5 8.5h23" stroke="currentColor" strokeWidth="1.4" />
        <rect x="5.5" y="12" width="5" height="2.5" rx="0.8" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "boleto",
    label: "Boleto",
    hint: "Vence em 3 dias úteis",
    officialSrc: null,
    mark: (
      <svg viewBox="0 0 28 20" width={MARK_SIZE.width} height={MARK_SIZE.height} fill="none" aria-hidden="true">
        <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
          <path d="M4 4v12M7.5 4v12M11 4v12M16 4v12M19.5 4v12M24 4v12" />
        </g>
        <path d="M13.5 4v12" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M21.75 4v12" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
    ),
  },
]

export function PaymentTrust() {
  return (
    <div
      id="checkout-selos-pagamento"
      data-testid="checkout-selos-pagamento"
      className="mt-4 rounded-lg border border-outline-variant bg-surface-container-low p-3"
    >
      <p className="mb-2.5 text-center font-caption text-caption uppercase tracking-wide text-on-surface-variant">
        Formas de pagamento aceitas
      </p>

      <ul className="grid grid-cols-3 items-stretch gap-2">
        {PAYMENT_MARKS.map((m) => (
          <li
            key={m.id}
            className="flex flex-col items-center gap-1 rounded-md border border-outline-variant bg-surface-container-lowest px-2 py-2 text-on-surface"
          >
            {m.officialSrc ? (
              <Image src={m.officialSrc} alt={m.label} width={MARK_SIZE.width} height={MARK_SIZE.height} />
            ) : (
              m.mark
            )}
            <span className="font-label-md text-label-md leading-none">{m.label}</span>
            <span className="text-center font-caption text-caption leading-tight text-on-surface-variant">
              {m.hint}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-2.5 flex items-center justify-center gap-1.5 text-center font-caption text-caption text-on-surface-variant">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
          <rect x="4" y="10" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
          <path d="M8 10V7a4 4 0 1 1 8 0v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <span>
          Pagamento processado pelo Mercado Pago. Os dados do cartão não passam por esta loja nem ficam guardados aqui.
        </span>
      </div>
    </div>
  )
}
