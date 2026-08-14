'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'
import { isValidCpf, onlyDigits } from '@/lib/documento'

export type DadosPessoais = {
  name: string
  cpf: string | null
  phone: string | null
  /** ISO `AAAA-MM-DD` — o que o input[type=date] devolve. */
  birthDate: string | null
  gender: string | null
}

/**
 * Salva os dados pessoais da cliente na área /conta.
 *
 * Escreve em duas tabelas de propósito: `getCheckoutPrefill` lê `customers`
 * antes de `user_profiles`, então gravar só no perfil deixaria o checkout
 * preenchendo com o dado antigo. O espelho em `customers` só acontece quando
 * a linha já existe — quem ainda não comprou nem salvou endereço não ganha
 * uma linha de cliente pela metade, e o prefill cai no perfil de qualquer forma.
 */
export async function updatePersonalData(
  dados: DadosPessoais
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Não autenticado' }

  const name = dados.name.trim()
  if (!name) return { ok: false, error: 'O nome não pode ficar vazio' }

  const cpf = onlyDigits(dados.cpf)
  if (cpf && !isValidCpf(cpf)) return { ok: false, error: 'CPF inválido' }

  const phone = onlyDigits(dados.phone)
  if (phone && (phone.length < 10 || phone.length > 11)) {
    return { ok: false, error: 'Telefone inválido — informe DDD e número' }
  }

  // Uma data futura é sempre erro de digitação, e o Postgres aceitaria sem reclamar.
  const birthDate = dados.birthDate?.trim() || null
  if (birthDate) {
    const data = new Date(`${birthDate}T00:00:00`)
    if (Number.isNaN(data.getTime())) {
      return { ok: false, error: 'Data de nascimento inválida' }
    }
    if (data > new Date()) {
      return { ok: false, error: 'A data de nascimento não pode ser no futuro' }
    }
  }

  const gender = dados.gender?.trim().slice(0, 40) || null

  // O .select() não é enfeite: um UPDATE barrado por RLS casa com zero linhas e
  // o Postgres devolve sucesso sem erro. Foi assim que a edição de nome ficou
  // quebrada em silêncio até a migration 039. Conferir a linha de volta faz uma
  // regressão de permissão aparecer como erro na tela, não como "salvo" mentiroso.
  const { data: atualizado, error } = await supabase
    .from('user_profiles')
    .update({
      name,
      cpf: cpf || null,
      phone: phone || null,
      birth_date: birthDate,
      gender,
    })
    .eq('id', user.id)
    .select('id')

  if (error) return { ok: false, error: 'Erro ao salvar seus dados' }
  if (!atualizado || atualizado.length === 0) {
    console.error('[updatePersonalData] update sem efeito para', user.id)
    return { ok: false, error: 'Não foi possível salvar seus dados. Tente novamente.' }
  }

  const service = createServiceClient()
  const { data: customer } = await service
    .from('customers')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (customer) {
    await service
      .from('customers')
      .update({ name, cpf_cnpj: cpf || null, phone: phone || null })
      .eq('user_id', user.id)
  }

  revalidatePath('/conta')
  return { ok: true }
}
