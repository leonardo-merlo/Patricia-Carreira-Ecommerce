import type { Metadata } from "next"
import Link from "next/link"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export const metadata: Metadata = {
  title: "Perguntas Frequentes | Patrícia Carreira",
  description: "Tire suas dúvidas sobre pedidos, envio, trocas e pagamentos na Patrícia Carreira.",
}

const FAQ_ITEMS = [
  {
    category: "Pedidos",
    questions: [
      {
        q: "Como posso rastrear meu pedido?",
        a: "Assim que seu pedido for enviado, você receberá um e-mail com o código de rastreio. Você também pode consultar o status em tempo real acessando /pedido/[número-do-pedido] ou pela aba 'Meus pedidos' na sua conta.",
      },
      {
        q: "Posso cancelar ou alterar um pedido?",
        a: "Cancelamentos são aceitos até o momento em que o pedido entra em separação. Após essa etapa, não é mais possível cancelar. Para solicitar, entre em contato pelo WhatsApp o mais rápido possível.",
      },
      {
        q: "Vocês emitem nota fiscal?",
        a: "Sim. A nota fiscal eletrônica (NF-e) é emitida automaticamente após a confirmação do pagamento e enviada para o e-mail cadastrado no pedido.",
      },
    ],
  },
  {
    category: "Envio",
    questions: [
      {
        q: "Vocês enviam para todo o Brasil?",
        a: "Sim! Enviamos para todos os estados brasileiros via Correios e transportadoras parceiras. O frete é calculado automaticamente no checkout com base no seu CEP.",
      },
      {
        q: "Qual o prazo de entrega?",
        a: "O prazo varia conforme a localidade e a transportadora escolhida. Em média, 3 a 8 dias úteis após a confirmação do pagamento. O prazo exato aparece no checkout antes de você finalizar a compra.",
      },
      {
        q: "O frete é grátis?",
        a: "Oferecemos frete grátis em compras acima de R$ 350 para determinadas regiões. O benefício é calculado automaticamente no checkout.",
      },
      {
        q: "Meu pedido pode ser rastreado?",
        a: "Sim. Todas as encomendas são enviadas com código de rastreio, que é enviado por e-mail assim que o pedido é postado.",
      },
    ],
  },
  {
    category: "Pagamento",
    questions: [
      {
        q: "Quais formas de pagamento são aceitas?",
        a: "Aceitamos PIX (aprovação imediata), cartão de crédito (em até 6x sem juros) e boleto bancário (compensação em até 3 dias úteis).",
      },
      {
        q: "Posso parcelar no cartão de crédito?",
        a: "Sim, parcelamos em até 6x sem juros no cartão de crédito. O parcelamento mínimo por parcela é de R$ 50.",
      },
      {
        q: "O PIX tem algum desconto?",
        a: "No momento não oferecemos desconto adicional para pagamentos via PIX, mas o processamento é imediato: assim que o pagamento é confirmado, seu pedido já entra em separação.",
      },
    ],
  },
  {
    category: "Produtos",
    questions: [
      {
        q: "As peças são realmente feitas à mão?",
        a: "Sim, absolutamente. Cada peça é produzida manualmente por Patrícia e sua equipe em Minas Gerais. Bordados, costuras e acabamentos são feitos com tempo e atenção. Por isso, pequenas variações entre peças são normais e fazem parte da identidade artesanal da marca.",
      },
      {
        q: "Como sei qual o meu tamanho?",
        a: "Na página de cada peça, você encontra a tabela de medidas com busto, cintura e quadril para cada tamanho. Em caso de dúvida, entre em contato pelo WhatsApp antes de finalizar a compra.",
      },
      {
        q: "Posso comprar no atacado?",
        a: "Sim! Atendemos revendedores e lojistas. Para pedidos no atacado, entre em contato diretamente via WhatsApp ou Instagram para receber condições especiais e tabela de preços.",
      },
    ],
  },
  {
    category: "Trocas e Devoluções",
    questions: [
      {
        q: "Como funciona a política de trocas?",
        a: "Você tem até 7 dias após o recebimento para solicitar troca ou devolução, conforme o Código de Defesa do Consumidor. A peça deve estar em perfeitas condições, sem uso, lavagem ou modificações. Consulte nossa política completa para mais detalhes.",
      },
      {
        q: "O frete de troca é cobrado?",
        a: "Em caso de defeito de fabricação ou erro no envio, o frete de retorno é por nossa conta. Em trocas por preferência (tamanho ou cor), o frete de devolução fica por conta do cliente.",
      },
    ],
  },
]

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-container px-margin-mobile py-16 md:px-margin-desktop">
      {/* Hero */}
      <div className="mx-auto max-w-2xl text-center">
        <p className="font-label-md text-label-md uppercase tracking-widest text-primary">
          Dúvidas frequentes
        </p>
        <h1 className="mt-3 font-display-lg text-display-lg-mobile text-on-surface md:text-display-lg">
          Como podemos ajudar?
        </h1>
        <p className="mt-5 font-body-lg text-body-lg text-on-surface-variant">
          Reunimos as dúvidas mais comuns sobre pedidos, envio, pagamento e produtos.
          Não encontrou o que precisa? Fale com a gente.
        </p>
      </div>

      <Separator className="my-12" />

      {/* FAQ por categoria */}
      <div className="mx-auto max-w-3xl space-y-12">
        {FAQ_ITEMS.map(({ category, questions }) => (
          <section key={category}>
            <h2 className="mb-6 font-headline-sm text-headline-sm text-on-surface">
              {category}
            </h2>
            <div className="space-y-2">
              {questions.map(({ q, a }) => (
                <details
                  key={q}
                  className="group rounded-xl border border-outline-variant bg-surface-container-low"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 [&::-webkit-details-marker]:hidden">
                    <span className="font-body-lg text-body-lg font-semibold text-on-surface">
                      {q}
                    </span>
                    <ChevronDown className="h-5 w-5 shrink-0 text-on-surface-variant transition-transform duration-200 group-open:rotate-180" />
                  </summary>
                  <div className="px-6 pb-5">
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      {a}
                    </p>
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      <Separator className="my-12" />

      {/* CTA contato */}
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-headline-sm text-headline-sm text-on-surface">
          Ainda com dúvidas?
        </h2>
        <p className="mt-2 font-body-lg text-body-lg text-on-surface-variant">
          Fale diretamente com a gente pelo WhatsApp ou Instagram.
          Respondemos o mais rápido possível.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <a
              href="https://wa.me/5522988223993"
              target="_blank"
              rel="noopener noreferrer"
            >
              Falar no WhatsApp
            </a>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/politica-de-trocas">Ver política de trocas</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
