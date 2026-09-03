import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export const metadata: Metadata = {
  title: "Política de Privacidade | Patrícia Carreira",
  description: "Saiba como coletamos, usamos e protegemos seus dados pessoais em conformidade com a LGPD.",
}

export default function PrivacidadePage() {
  return (
    <div className="mx-auto max-w-container px-margin-mobile py-16 md:px-margin-desktop">
      {/* Hero */}
      <div className="mx-auto max-w-2xl text-center">
        <p className="font-label-md text-label-md uppercase tracking-widest text-primary">
          Informações
        </p>
        <h1 className="mt-3 font-display-lg text-display-lg-mobile text-on-surface md:text-display-lg">
          Política de Privacidade
        </h1>
        <p className="mt-5 font-body-lg text-body-lg text-on-surface-variant">
          Levamos sua privacidade a sério. Esta política descreve quais dados coletamos,
          como os usamos e quais são os seus direitos como titular.
        </p>
        <p className="mt-3 font-caption text-caption text-on-surface-variant">
          Última atualização: maio de 2026
        </p>
      </div>

      <Separator className="my-12" />

      {/* Conteúdo */}
      <div className="mx-auto max-w-3xl space-y-10 font-body-md text-body-md text-on-surface-variant">

        <section>
          <h2 className="mb-4 font-headline-sm text-headline-sm text-on-surface">
            1. Quem somos
          </h2>
          <p>
            A <strong className="text-on-surface">Patrícia Carreira</strong> é uma marca de moda
            artesanal sediada em Minas Gerais, com loja física em Arraial d&apos;Ajuda (BA) e
            comércio eletrônico em todo o Brasil. Para os fins desta política, somos o
            <strong className="text-on-surface"> controlador dos dados</strong> coletados neste
            site, em conformidade com a
            <strong className="text-on-surface"> Lei Geral de Proteção de Dados (LGPD, Lei nº 13.709/2018)</strong>.
          </p>
        </section>

        <section>
          <h2 className="mb-4 font-headline-sm text-headline-sm text-on-surface">
            2. Dados que coletamos
          </h2>
          <p className="mb-4">
            Coletamos apenas os dados necessários para processar pedidos,
            melhorar a experiência de compra e cumprir obrigações legais:
          </p>
          <div className="space-y-4">
            <div className="rounded-xl border border-outline-variant bg-surface-container-low p-5">
              <p className="font-semibold text-on-surface">Dados de identificação</p>
              <p className="mt-1">Nome completo, CPF/CNPJ, e-mail e telefone, coletados no checkout ou ao criar uma conta.</p>
            </div>
            <div className="rounded-xl border border-outline-variant bg-surface-container-low p-5">
              <p className="font-semibold text-on-surface">Dados de endereço</p>
              <p className="mt-1">CEP, logradouro, número, complemento, bairro, cidade e estado, necessários para calcular frete e entregar o pedido.</p>
            </div>
            <div className="rounded-xl border border-outline-variant bg-surface-container-low p-5">
              <p className="font-semibold text-on-surface">Dados de pagamento</p>
              <p className="mt-1">Não armazenamos dados de cartão de crédito. O processamento é feito pelo Mercado Pago, que possui sua própria política de segurança.</p>
            </div>
            <div className="rounded-xl border border-outline-variant bg-surface-container-low p-5">
              <p className="font-semibold text-on-surface">Dados de navegação</p>
              <p className="mt-1">Informações técnicas como endereço IP, tipo de navegador e páginas acessadas, coletados de forma anônima para melhorar o site.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-4 font-headline-sm text-headline-sm text-on-surface">
            3. Como usamos seus dados
          </h2>
          <p className="mb-3">Seus dados são utilizados exclusivamente para:</p>
          <ul className="ml-5 list-disc space-y-2">
            <li>Processar e entregar seus pedidos</li>
            <li>Emitir nota fiscal eletrônica (NF-e) conforme exigência legal</li>
            <li>Enviar e-mails transacionais (confirmação de pedido, código de rastreio, status)</li>
            <li>Responder dúvidas e solicitações de suporte</li>
            <li>Cumprir obrigações legais e regulatórias</li>
            <li>Melhorar a experiência de navegação no site (dados anônimos)</li>
          </ul>
          <p className="mt-3">
            Não vendemos, alugamos ou compartilhamos seus dados com terceiros para fins
            comerciais ou de marketing sem o seu consentimento expresso.
          </p>
        </section>

        <section>
          <h2 className="mb-4 font-headline-sm text-headline-sm text-on-surface">
            4. Compartilhamento de dados
          </h2>
          <p className="mb-3">
            Compartilhamos dados pessoais apenas quando estritamente necessário,
            com os seguintes parceiros:
          </p>
          <ul className="ml-5 list-disc space-y-2">
            <li><strong className="text-on-surface">Mercado Pago:</strong> processamento de pagamentos</li>
            <li><strong className="text-on-surface">Melhor Envio / transportadoras:</strong> geração de etiquetas e rastreamento</li>
            <li><strong className="text-on-surface">Focus NFe:</strong> emissão de notas fiscais eletrônicas</li>
            <li><strong className="text-on-surface">Resend:</strong> envio de e-mails transacionais</li>
            <li><strong className="text-on-surface">Supabase:</strong> armazenamento seguro de dados (servidores na AWS)</li>
          </ul>
          <p className="mt-3">
            Todos os parceiros são selecionados com critérios de segurança e possuem
            políticas de privacidade próprias em conformidade com a LGPD.
          </p>
        </section>

        <section>
          <h2 className="mb-4 font-headline-sm text-headline-sm text-on-surface">
            5. Tempo de retenção
          </h2>
          <p>
            Mantemos seus dados pelo tempo necessário para cumprir as finalidades
            descritas nesta política e as obrigações legais aplicáveis,
            especialmente fiscais e contábeis, que exigem retenção por até
            <strong className="text-on-surface"> 5 anos</strong>.
          </p>
          <p className="mt-3">
            Dados de contas inativas podem ser excluídos após 2 anos sem acesso,
            mediante notificação prévia por e-mail.
          </p>
        </section>

        <section>
          <h2 className="mb-4 font-headline-sm text-headline-sm text-on-surface">
            6. Seus direitos (LGPD)
          </h2>
          <p className="mb-3">
            Como titular dos dados, você tem os seguintes direitos garantidos pela LGPD:
          </p>
          <ul className="ml-5 list-disc space-y-2">
            <li><strong className="text-on-surface">Confirmação:</strong> saber se tratamos seus dados</li>
            <li><strong className="text-on-surface">Acesso:</strong> obter uma cópia dos dados que temos sobre você</li>
            <li><strong className="text-on-surface">Correção:</strong> corrigir dados incompletos, inexatos ou desatualizados</li>
            <li><strong className="text-on-surface">Exclusão:</strong> solicitar a exclusão dos seus dados (respeitando obrigações legais)</li>
            <li><strong className="text-on-surface">Portabilidade:</strong> receber seus dados em formato legível por máquina</li>
            <li><strong className="text-on-surface">Revogação:</strong> retirar o consentimento a qualquer momento</li>
            <li><strong className="text-on-surface">Oposição:</strong> se opor ao tratamento realizado em desacordo com a lei</li>
          </ul>
          <p className="mt-3">
            Para exercer qualquer desses direitos, entre em contato pelo e-mail
            ou WhatsApp indicados ao final desta página.
            Respondemos em até <strong className="text-on-surface">15 dias corridos</strong>.
          </p>
        </section>

        <section>
          <h2 className="mb-4 font-headline-sm text-headline-sm text-on-surface">
            7. Segurança dos dados
          </h2>
          <p>
            Adotamos medidas técnicas e organizacionais adequadas para proteger seus dados
            contra acesso não autorizado, perda, alteração ou divulgação indevida.
            Isso inclui conexão HTTPS, criptografia em repouso no banco de dados
            e controle de acesso por perfil de usuário.
          </p>
          <p className="mt-3">
            Em caso de incidente de segurança que possa causar risco ou dano a titulares,
            notificaremos a ANPD e os afetados conforme previsto na LGPD.
          </p>
        </section>

        <section>
          <h2 className="mb-4 font-headline-sm text-headline-sm text-on-surface">
            8. Cookies
          </h2>
          <p>
            Utilizamos cookies essenciais para o funcionamento do site (como o carrinho de compras)
            e cookies analíticos anônimos para entender como o site é usado.
            Não utilizamos cookies de rastreamento comportamental ou de terceiros para fins publicitários.
          </p>
        </section>

        <section>
          <h2 className="mb-4 font-headline-sm text-headline-sm text-on-surface">
            9. Alterações nesta política
          </h2>
          <p>
            Podemos atualizar esta política periodicamente. Quando houver alterações
            relevantes, notificaremos por e-mail os clientes cadastrados e exibiremos
            a data da última atualização no topo desta página.
          </p>
        </section>

        <section>
          <h2 className="mb-4 font-headline-sm text-headline-sm text-on-surface">
            10. Contato
          </h2>
          <p>
            Para dúvidas, solicitações ou exercício dos seus direitos como titular de dados,
            entre em contato:
          </p>
          <ul className="ml-5 mt-3 list-disc space-y-2">
            <li>
              <strong className="text-on-surface">E-mail:</strong>{" "}
              <a href="mailto:creation@patriciacarreira.com.br" className="text-primary underline underline-offset-2">
                creation@patriciacarreira.com.br
              </a>
            </li>
            <li>
              <strong className="text-on-surface">WhatsApp:</strong>{" "}
              <a href="https://wa.me/5522988223993" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
                (22) 98822-3993
              </a>
            </li>
            <li><strong className="text-on-surface">Instagram:</strong> @patriciacarreira_</li>
          </ul>
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
            <Link href="/politica-de-trocas">Política de trocas</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/politica-de-envio">Política de envio</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/faq">Perguntas frequentes</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
