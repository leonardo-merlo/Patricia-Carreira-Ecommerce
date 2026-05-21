import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export const metadata: Metadata = {
  title: "Política de Envio | Patrícia Carreira",
  description: "Informações sobre frete, prazos de entrega e rastreamento de pedidos na Patrícia Carreira.",
}

const SHIPPING_OPTIONS = [
  {
    name: "PAC (Correios)",
    description: "Entrega econômica para todo o Brasil",
    deadline: "6 a 12 dias úteis",
    note: "Disponível para todos os CEPs",
  },
  {
    name: "SEDEX (Correios)",
    description: "Entrega expressa para todo o Brasil",
    deadline: "2 a 5 dias úteis",
    note: "Disponível para todos os CEPs",
  },
  {
    name: "Transportadora",
    description: "Entrega via transportadora parceira",
    deadline: "3 a 8 dias úteis",
    note: "Disponível em regiões selecionadas",
  },
]

export default function PoliticaDeEnvioPage() {
  return (
    <div className="mx-auto max-w-container px-margin-mobile py-16 md:px-margin-desktop">
      {/* Hero */}
      <div className="mx-auto max-w-2xl text-center">
        <p className="font-label-md text-label-md uppercase tracking-widest text-primary">
          Informações
        </p>
        <h1 className="mt-3 font-display-lg text-display-lg-mobile text-on-surface md:text-display-lg">
          Política de Envio
        </h1>
        <p className="mt-5 font-body-lg text-body-lg text-on-surface-variant">
          Enviamos para todo o Brasil com segurança e rastreamento.
          Confira tudo sobre prazos, frete e como acompanhar seu pedido.
        </p>
      </div>

      <Separator className="my-12" />

      {/* Opções de frete */}
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-8 font-headline-sm text-headline-sm text-on-surface">
          Opções de envio
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {SHIPPING_OPTIONS.map(({ name, description, deadline, note }) => (
            <div
              key={name}
              className="rounded-xl border border-outline-variant bg-surface-container-low p-5"
            >
              <p className="font-body-lg text-body-lg font-semibold text-on-surface">{name}</p>
              <p className="mt-1 font-body-md text-body-md text-on-surface-variant">{description}</p>
              <p className="mt-3 font-label-md text-label-md text-primary">{deadline}</p>
              <p className="mt-1 font-caption text-caption text-on-surface-variant">{note}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 font-caption text-caption text-on-surface-variant">
          * Prazos contados a partir da confirmação do pagamento e em dias úteis.
          O prazo exato para seu CEP é calculado automaticamente no checkout.
        </p>
      </div>

      <Separator className="my-12" />

      {/* Conteúdo detalhado */}
      <div className="mx-auto max-w-3xl space-y-10 font-body-md text-body-md text-on-surface-variant">

        {/* Cálculo de frete */}
        <section>
          <h2 className="mb-4 font-headline-sm text-headline-sm text-on-surface">
            1. Cálculo do frete
          </h2>
          <p>
            O valor do frete é calculado automaticamente no checkout com base no
            seu CEP de entrega e nos produtos do seu carrinho. Utilizamos o serviço
            <strong className="text-on-surface"> Melhor Envio</strong>, que compara
            preços entre múltiplas transportadoras para você escolher a melhor opção.
          </p>
          <p className="mt-3">
            O peso e as dimensões de cada produto são considerados no cálculo.
            Pedidos com múltiplos itens podem ter o frete calculado de forma consolidada,
            resultando em economia.
          </p>
        </section>

        {/* Frete grátis */}
        <section>
          <h2 className="mb-4 font-headline-sm text-headline-sm text-on-surface">
            2. Frete grátis
          </h2>
          <div className="rounded-xl border border-outline-variant bg-surface-container-low p-5">
            <p className="font-semibold text-on-surface">
              Frete grátis em compras acima de R$ 350
            </p>
            <p className="mt-1">
              Válido para entregas via PAC nos Correios, para todos os CEPs do Brasil.
              O benefício é aplicado automaticamente no checkout quando o valor do
              carrinho atingir o mínimo necessário.
            </p>
          </div>
        </section>

        {/* Processamento */}
        <section>
          <h2 className="mb-4 font-headline-sm text-headline-sm text-on-surface">
            3. Processamento e postagem
          </h2>
          <p>
            Cada peça é preparada e embalada com cuidado antes do envio.
            O prazo de processamento é de <strong className="text-on-surface">1 a 2 dias úteis</strong> após
            a confirmação do pagamento — este tempo não está incluído no prazo de entrega
            informado pela transportadora.
          </p>
          <p className="mt-3">
            Pedidos pagos via PIX têm aprovação imediata e entram em processamento
            no mesmo dia (se confirmados até as 14h em dia útil). Pedidos pagos por
            boleto entram em processamento após a compensação bancária, que pode levar
            até 3 dias úteis.
          </p>
        </section>

        {/* Rastreamento */}
        <section>
          <h2 className="mb-4 font-headline-sm text-headline-sm text-on-surface">
            4. Rastreamento
          </h2>
          <p>
            Assim que seu pedido for postado, você receberá um e-mail com o código
            de rastreio. Você pode acompanhar o status:
          </p>
          <ul className="ml-5 mt-3 list-disc space-y-2">
            <li>Pelo site dos Correios (rastreamento.correios.com.br) ou da transportadora</li>
            <li>Pela página de status do pedido neste site</li>
            <li>Pela aba "Meus pedidos" na sua conta (quando disponível)</li>
          </ul>
        </section>

        {/* Endereço e responsabilidade */}
        <section>
          <h2 className="mb-4 font-headline-sm text-headline-sm text-on-surface">
            5. Endereço de entrega
          </h2>
          <p>
            Verifique cuidadosamente o endereço de entrega antes de finalizar o pedido.
            Pedidos enviados para endereços incorretos informados pelo cliente não são
            de nossa responsabilidade. Em caso de devolução por endereço errado, um novo
            frete será cobrado para reenvio.
          </p>
          <p className="mt-3">
            Caso precise alterar o endereço após a confirmação do pedido, entre em contato
            o mais rápido possível — alterações só são possíveis antes da postagem.
          </p>
        </section>

        {/* Extravio */}
        <section>
          <h2 className="mb-4 font-headline-sm text-headline-sm text-on-surface">
            6. Atraso ou extravio
          </h2>
          <p>
            Se o prazo de entrega estimado for ultrapassado em mais de 5 dias úteis
            sem atualização no rastreamento, entre em contato para que possamos
            abrir uma investigação junto à transportadora.
          </p>
          <p className="mt-3">
            Em casos confirmados de extravio, substituímos o pedido sem custo adicional
            ou realizamos o reembolso integral, conforme a preferência do cliente.
          </p>
        </section>

      </div>

      <Separator className="my-12" />

      {/* CTA */}
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-headline-sm text-headline-sm text-on-surface">
          Dúvidas sobre o seu envio?
        </h2>
        <p className="mt-2 font-body-lg text-body-lg text-on-surface-variant">
          Fale diretamente com a gente. Respondemos o mais rápido possível.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <a
              href="https://wa.me/5500000000000"
              target="_blank"
              rel="noopener noreferrer"
            >
              Falar no WhatsApp
            </a>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/faq">Ver perguntas frequentes</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
