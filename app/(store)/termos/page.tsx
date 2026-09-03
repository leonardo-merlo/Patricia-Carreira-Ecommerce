import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export const metadata: Metadata = {
  title: "Termos de Uso | Patrícia Carreira",
  description: "Leia os termos e condições que regem o uso do site e as compras na loja Patrícia Carreira.",
}

export default function TermosPage() {
  return (
    <div className="mx-auto max-w-container px-margin-mobile py-16 md:px-margin-desktop">
      {/* Hero */}
      <div className="mx-auto max-w-2xl text-center">
        <p className="font-label-md text-label-md uppercase tracking-widest text-primary">
          Informações
        </p>
        <h1 className="mt-3 font-display-lg text-display-lg-mobile text-on-surface md:text-display-lg">
          Termos de Uso
        </h1>
        <p className="mt-5 font-body-lg text-body-lg text-on-surface-variant">
          Ao utilizar este site ou realizar uma compra, você concorda com os termos e
          condições descritos abaixo. Leia com atenção.
        </p>
        <p className="mt-3 font-caption text-caption text-on-surface-variant">
          Última atualização: junho de 2026
        </p>
      </div>

      <Separator className="my-12" />

      {/* Conteúdo */}
      <div className="mx-auto max-w-3xl space-y-10 font-body-md text-body-md text-on-surface-variant">

        <section>
          <h2 className="mb-4 font-headline-sm text-headline-sm text-on-surface">
            1. Aceitação dos termos
          </h2>
          <p>
            Ao acessar e utilizar o site da <strong className="text-on-surface">Patrícia Carreira</strong>,
            você declara ter lido, compreendido e concordado com estes Termos de Uso, bem como com
            nossa <Link href="/privacidade" className="text-primary underline underline-offset-2">Política de Privacidade</Link>.
            Se não concordar com qualquer disposição, não utilize o site nem realize compras.
          </p>
          <p className="mt-3">
            O uso continuado do site após alterações nos termos equivale à aceitação das
            novas condições.
          </p>
        </section>

        <section>
          <h2 className="mb-4 font-headline-sm text-headline-sm text-on-surface">
            2. Cadastro e conta
          </h2>
          <p>
            Para criar uma conta, você deve fornecer informações verdadeiras, completas e
            atualizadas. É proibido criar contas com dados falsos ou de terceiros sem
            autorização.
          </p>
          <p className="mt-3">
            Você é responsável por manter a confidencialidade da sua senha e por todas as
            atividades realizadas com sua conta. Em caso de uso não autorizado, notifique-nos
            imediatamente. A Patrícia Carreira não se responsabiliza por danos decorrentes do
            uso indevido de credenciais por terceiros.
          </p>
          <p className="mt-3">
            É possível realizar compras sem criar conta (guest checkout). Nesse caso, seus
            dados são utilizados exclusivamente para processar e entregar o pedido.
          </p>
        </section>

        <section>
          <h2 className="mb-4 font-headline-sm text-headline-sm text-on-surface">
            3. Produtos e preços
          </h2>
          <p>
            As fotografias dos produtos são meramente ilustrativas. Por se tratar de
            <strong className="text-on-surface"> moda artesanal</strong>, variações naturais
            de cor, textura e acabamento fazem parte da identidade da marca e não constituem
            defeito de fabricação.
          </p>
          <p className="mt-3">
            Todos os preços são expressos em <strong className="text-on-surface">Reais (BRL)</strong> e
            incluem os impostos legalmente exigidos. Os preços podem ser alterados sem aviso
            prévio, porém pedidos já confirmados e pagos mantêm o preço registrado no momento
            da compra.
          </p>
          <p className="mt-3">
            A disponibilidade dos produtos é verificada em tempo real. A exibição de um produto
            no site não garante disponibilidade imediata em estoque.
          </p>
        </section>

        <section>
          <h2 className="mb-4 font-headline-sm text-headline-sm text-on-surface">
            4. Pedidos e pagamento
          </h2>
          <p>
            Um pedido é considerado <strong className="text-on-surface">confirmado</strong> somente
            após a aprovação do pagamento pela operadora financeira. O recebimento do e-mail de
            confirmação comprova que o pedido foi aceito e está em processamento.
          </p>
          <p className="mt-3">
            A <strong className="text-on-surface">Nota Fiscal Eletrônica (NF-e)</strong> é emitida
            automaticamente após a confirmação do pagamento e enviada ao e-mail informado no checkout.
          </p>
          <p className="mt-3">
            Meios de pagamento aceitos:
          </p>
          <ul className="ml-5 mt-2 list-disc space-y-1">
            <li><strong className="text-on-surface">PIX</strong>: aprovação imediata</li>
            <li><strong className="text-on-surface">Cartão de crédito</strong>: parcelamento em até 6x sem juros</li>
            <li><strong className="text-on-surface">Boleto bancário</strong>: vencimento em 3 dias úteis; pedido processado após compensação</li>
          </ul>
          <p className="mt-3">
            O processamento dos pagamentos é realizado pelo <strong className="text-on-surface">Mercado Pago</strong>.
            Não armazenamos dados de cartão de crédito.
          </p>
        </section>

        <section>
          <h2 className="mb-4 font-headline-sm text-headline-sm text-on-surface">
            5. Frete e entrega
          </h2>
          <p>
            Os prazos e valores de frete são calculados no momento do checkout com base no CEP
            de destino e nas dimensões dos produtos, via <strong className="text-on-surface">Melhor Envio</strong>.
            O prazo começa a contar a partir da <strong className="text-on-surface">postagem</strong> do
            pedido, não da data de compra.
          </p>
          <p className="mt-3">
            Após a postagem, a responsabilidade pela entrega passa para a transportadora
            contratada. A Patrícia Carreira não se responsabiliza por atrasos, extravios ou
            danos causados durante o transporte, mas auxiliará na abertura de ocorrências junto
            à transportadora quando necessário.
          </p>
          <p className="mt-3">
            O código de rastreio será disponibilizado por e-mail assim que o pedido for postado.
          </p>
        </section>

        <section>
          <h2 className="mb-4 font-headline-sm text-headline-sm text-on-surface">
            6. Trocas e devoluções
          </h2>
          <p>
            Em conformidade com o <strong className="text-on-surface">art. 49 do Código de Defesa
            do Consumidor (CDC)</strong>, o cliente pode desistir da compra realizada pela internet
            em até <strong className="text-on-surface">7 (sete) dias corridos</strong> contados do
            recebimento do produto, sem necessidade de justificativa.
          </p>
          <p className="mt-3">
            Para exercer o direito de arrependimento, entre em contato pelos nossos canais de
            atendimento. O produto deve ser devolvido:
          </p>
          <ul className="ml-5 mt-2 list-disc space-y-1">
            <li>Sem uso, lavagem ou modificação</li>
            <li>Com etiquetas originais intactas</li>
            <li>Na embalagem original ou equivalente</li>
          </ul>
          <p className="mt-3">
            <strong className="text-on-surface">Exceção:</strong> peças personalizadas ou
            confeccionadas sob medida a pedido do cliente não estão sujeitas ao direito de
            arrependimento, conforme parágrafo único do art. 49 do CDC.
          </p>
          <p className="mt-3">
            Para informações completas, consulte nossa{" "}
            <Link href="/politica-de-trocas" className="text-primary underline underline-offset-2">
              Política de Trocas e Devoluções
            </Link>.
          </p>
        </section>

        <section>
          <h2 className="mb-4 font-headline-sm text-headline-sm text-on-surface">
            7. Propriedade intelectual
          </h2>
          <p>
            Todo o conteúdo do site (fotografias, vídeos, textos, logotipos, designs
            e identidade visual) é propriedade exclusiva da{" "}
            <strong className="text-on-surface">Patrícia Carreira</strong> e está protegido
            pela legislação brasileira de direitos autorais e propriedade intelectual.
          </p>
          <p className="mt-3">
            É vedada a reprodução, distribuição, cópia ou uso comercial de qualquer conteúdo
            do site sem autorização prévia e expressa por escrito.
          </p>
        </section>

        <section>
          <h2 className="mb-4 font-headline-sm text-headline-sm text-on-surface">
            8. Limitação de responsabilidade
          </h2>
          <p>
            A Patrícia Carreira não se responsabiliza por:
          </p>
          <ul className="ml-5 mt-2 list-disc space-y-1">
            <li>Atrasos ou falhas na entrega causados por transportadoras terceirizadas</li>
            <li>Indisponibilidade temporária do site por manutenção ou falhas técnicas</li>
            <li>Danos decorrentes de caso fortuito, força maior ou fatos de terceiros</li>
            <li>Uso indevido das informações da conta pelo próprio cliente ou por terceiros mediante acesso às suas credenciais</li>
          </ul>
          <p className="mt-3">
            Nossa responsabilidade fica limitada ao valor do produto e do frete pagos pelo
            cliente no pedido em questão.
          </p>
        </section>

        <section>
          <h2 className="mb-4 font-headline-sm text-headline-sm text-on-surface">
            9. Alterações nos termos
          </h2>
          <p>
            Estes Termos de Uso podem ser alterados a qualquer momento para refletir mudanças
            legais, operacionais ou de serviço. A versão vigente estará sempre disponível nesta
            página, com a data de atualização indicada no topo.
          </p>
          <p className="mt-3">
            Recomendamos que você revise os termos periodicamente. O uso continuado do site
            após a publicação de alterações constitui aceitação das novas condições.
          </p>
        </section>

        <section>
          <h2 className="mb-4 font-headline-sm text-headline-sm text-on-surface">
            10. Foro e lei aplicável
          </h2>
          <p>
            Estes Termos de Uso são regidos pelas leis da República Federativa do Brasil.
            Para dirimir quaisquer controvérsias decorrentes deste instrumento, fica eleito o
            foro da <strong className="text-on-surface">comarca de Porto Seguro/BA</strong> (jurisdição
            de Arraial d&apos;Ajuda), com exclusão de qualquer outro, por mais privilegiado que seja.
          </p>
          <p className="mt-3">
            Para dúvidas ou reclamações, entre em contato conosco antes de acionar qualquer
            instância judicial.
          </p>
        </section>

      </div>

      <Separator className="my-12" />

      {/* Links relacionados */}
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-headline-sm text-headline-sm text-on-surface">
          Outras políticas
        </h2>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild variant="outline">
            <Link href="/privacidade">Política de privacidade</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/politica-de-trocas">Política de trocas</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/faq">Perguntas frequentes</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
