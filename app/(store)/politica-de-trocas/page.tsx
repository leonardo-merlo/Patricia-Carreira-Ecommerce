import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export const metadata: Metadata = {
  title: "Política de Trocas | Patrícia Carreira",
  description: "Saiba como funciona nossa política de trocas e devoluções. Você tem até 7 dias após o recebimento para solicitar.",
}

export default function PoliticaDeTrocasPage() {
  return (
    <div className="mx-auto max-w-container px-margin-mobile py-16 md:px-margin-desktop">
      {/* Hero */}
      <div className="mx-auto max-w-2xl text-center">
        <p className="font-label-md text-label-md uppercase tracking-widest text-primary">
          Informações
        </p>
        <h1 className="mt-3 font-display-lg text-display-lg-mobile text-on-surface md:text-display-lg">
          Política de Trocas
        </h1>
        <p className="mt-5 font-body-lg text-body-lg text-on-surface-variant">
          Queremos que você fique completamente satisfeita com cada peça.
          Confira abaixo como funcionam nossas trocas e devoluções.
        </p>
      </div>

      <Separator className="my-12" />

      {/* Conteúdo */}
      <div className="mx-auto max-w-3xl space-y-10 font-body-md text-body-md text-on-surface-variant">

        {/* Prazo */}
        <section>
          <h2 className="mb-4 font-headline-sm text-headline-sm text-on-surface">
            1. Prazo para solicitação
          </h2>
          <p>
            Você tem até <strong className="text-on-surface">7 (sete) dias corridos</strong> após
            o recebimento do produto para solicitar troca ou devolução, conforme previsto no
            Código de Defesa do Consumidor (Lei nº 8.078/1990).
          </p>
          <p className="mt-3">
            Solicitações feitas após esse prazo não serão aceitas, salvo em casos de
            defeito de fabricação identificado posteriormente, que deve ser reportado
            assim que identificado.
          </p>
        </section>

        {/* Condições */}
        <section>
          <h2 className="mb-4 font-headline-sm text-headline-sm text-on-surface">
            2. Condições da peça
          </h2>
          <p className="mb-3">
            Para que a troca ou devolução seja aceita, a peça deve atender a todos os
            critérios abaixo:
          </p>
          <ul className="ml-5 list-disc space-y-2">
            <li>Sem uso, lavagem ou qualquer tipo de alteração</li>
            <li>Com todas as etiquetas originais intactas</li>
            <li>Na embalagem original, se possível</li>
            <li>Sem sinais de perfume, maquiagem, suor ou outros odores</li>
          </ul>
          <p className="mt-3">
            Peças que não atendam a essas condições serão devolvidas ao cliente
            sem processamento da troca.
          </p>
        </section>

        {/* Como solicitar */}
        <section>
          <h2 className="mb-4 font-headline-sm text-headline-sm text-on-surface">
            3. Como solicitar uma troca
          </h2>
          <p className="mb-3">Para iniciar o processo de troca ou devolução:</p>
          <ol className="ml-5 list-decimal space-y-2">
            <li>
              Entre em contato pelo <strong className="text-on-surface">WhatsApp</strong> ou
              pelo <strong className="text-on-surface">Instagram</strong> informando
              o número do pedido e o motivo da solicitação.
            </li>
            <li>
              Envie fotos da peça mostrando o defeito (quando aplicável) ou
              o estado geral do produto.
            </li>
            <li>
              Aguarde a confirmação da equipe, que retornará em até
              2 dias úteis com as instruções de envio.
            </li>
            <li>
              Envie a peça ao endereço indicado. O prazo de 7 dias é válido
              para o contato inicial — o envio pode ocorrer após esse prazo,
              desde que a solicitação tenha sido feita dentro do período.
            </li>
          </ol>
        </section>

        {/* Frete de devolução */}
        <section>
          <h2 className="mb-4 font-headline-sm text-headline-sm text-on-surface">
            4. Frete de devolução
          </h2>
          <div className="space-y-4">
            <div className="rounded-xl border border-outline-variant bg-surface-container-low p-5">
              <p className="font-semibold text-on-surface">Defeito de fabricação ou erro no envio</p>
              <p className="mt-1">
                O frete de retorno é <strong className="text-on-surface">por nossa conta</strong>.
                Você receberá um código de postagem para enviar a peça sem custo.
              </p>
            </div>
            <div className="rounded-xl border border-outline-variant bg-surface-container-low p-5">
              <p className="font-semibold text-on-surface">Troca por preferência (tamanho, cor ou arrependimento)</p>
              <p className="mt-1">
                O frete de devolução fica <strong className="text-on-surface">por conta do cliente</strong>.
                O envio da nova peça é feito sem custo adicional de frete.
              </p>
            </div>
          </div>
        </section>

        {/* Reembolso */}
        <section>
          <h2 className="mb-4 font-headline-sm text-headline-sm text-on-surface">
            5. Reembolso
          </h2>
          <p>
            Em casos de devolução (sem troca por outra peça), o reembolso é feito pelo
            mesmo meio de pagamento utilizado na compra, após a verificação do produto
            recebido em nosso estúdio.
          </p>
          <ul className="ml-5 mt-3 list-disc space-y-2">
            <li><strong className="text-on-surface">PIX:</strong> em até 3 dias úteis após a confirmação do recebimento</li>
            <li><strong className="text-on-surface">Cartão de crédito:</strong> em até 2 faturas, conforme a operadora</li>
            <li><strong className="text-on-surface">Boleto:</strong> em até 10 dias úteis via transferência bancária</li>
          </ul>
        </section>

        {/* Exceções */}
        <section>
          <h2 className="mb-4 font-headline-sm text-headline-sm text-on-surface">
            6. Exceções — itens sem troca
          </h2>
          <p className="mb-3">
            Por questões de higiene e natureza do produto, os itens abaixo não são elegíveis
            para troca ou devolução, salvo em caso de defeito de fabricação:
          </p>
          <ul className="ml-5 list-disc space-y-2">
            <li>Peças com sinais de uso ou lavagem</li>
            <li>Produtos personalizados ou sob encomenda</li>
            <li>Itens em promoção ou liquidação com desconto acima de 40%</li>
          </ul>
        </section>

      </div>

      <Separator className="my-12" />

      {/* CTA */}
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-headline-sm text-headline-sm text-on-surface">
          Precisa solicitar uma troca?
        </h2>
        <p className="mt-2 font-body-lg text-body-lg text-on-surface-variant">
          Entre em contato diretamente. Nossa equipe responde em até 2 dias úteis.
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
