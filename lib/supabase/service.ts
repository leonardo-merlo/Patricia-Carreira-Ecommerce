import { createClient } from '@supabase/supabase-js'

/**
 * O Next embrulha o `fetch` global e guarda as respostas de GET no Data Cache.
 * Toda leitura do PostgREST é um GET com a mesma URL, então a resposta ficava
 * congelada: o painel mostrava a lista de pedidos de horas atrás e nem F5, nem
 * fechar a aba, nem `export const dynamic = 'force-dynamic'` traziam o dado novo.
 *
 * O sintoma era desigual e por isso enganoso — os contadores da sidebar
 * atualizavam porque `count: 'exact', head: true` vira uma requisição HEAD, que
 * o Next não guarda. Só as listas travavam.
 *
 * Leitura de banco nunca deve vir de cache aqui: quem decide o que é cacheável
 * é a página, não o driver.
 */
function fetchSemCache(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, { ...init, cache: 'no-store' })
}

export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
      global: { fetch: fetchSemCache },
    }
  )
}
