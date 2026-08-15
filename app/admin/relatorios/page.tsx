import { redirect } from 'next/navigation'

// A seção virou /admin/vendas — o conteúdo sempre foi sobre receita e venda, não
// relatórios em geral. Isto existe só para não quebrar link salvo ou histórico
// do navegador; pode sair quando ninguém mais chegar por aqui.
export default function RelatoriosRedirect({
  searchParams,
}: {
  searchParams: { period?: string }
}) {
  const query = searchParams.period ? `?period=${encodeURIComponent(searchParams.period)}` : ''
  redirect(`/admin/vendas${query}`)
}
