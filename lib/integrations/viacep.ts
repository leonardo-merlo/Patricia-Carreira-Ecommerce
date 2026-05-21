export type ViaCEPAddress = {
  logradouro: string
  bairro: string
  localidade: string
  uf: string
}

export async function fetchAddressByCEP(cep: string): Promise<ViaCEPAddress | null> {
  const clean = cep.replace(/\D/g, "")
  if (clean.length !== 8) return null
  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`)
    if (!res.ok) return null
    const data: Record<string, string> = await res.json()
    if (data.erro) return null
    return {
      logradouro: data.logradouro ?? "",
      bairro: data.bairro ?? "",
      localidade: data.localidade ?? "",
      uf: data.uf ?? "",
    }
  } catch {
    return null
  }
}
