// Validação de CPF/CNPJ pelo dígito verificador.
//
// Existe porque o Melhor Envio confere o dígito e recusa o pedido inteiro
// quando o documento do remetente não fecha — antes de mandar, é melhor saber
// se o dado presta e, se não prestar, omitir o campo em vez de ser recusado.

export function onlyDigits(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '')
}

export function isValidCpf(value: string | null | undefined): boolean {
  const cpf = onlyDigits(value)
  if (cpf.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false

  const digit = (length: number): number => {
    let sum = 0
    for (let i = 0; i < length; i++) {
      sum += Number(cpf[i]) * (length + 1 - i)
    }
    const rest = (sum * 10) % 11
    return rest === 10 ? 0 : rest
  }

  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10])
}

export function isValidCnpj(value: string | null | undefined): boolean {
  const cnpj = onlyDigits(value)
  if (cnpj.length !== 14) return false
  if (/^(\d)\1{13}$/.test(cnpj)) return false

  const digit = (length: number): number => {
    const weights = length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    let sum = 0
    for (let i = 0; i < length; i++) {
      sum += Number(cnpj[i]) * weights[i]
    }
    const rest = sum % 11
    return rest < 2 ? 0 : 11 - rest
  }

  return digit(12) === Number(cnpj[12]) && digit(13) === Number(cnpj[13])
}

/** CEP brasileiro tem 8 dígitos e não pode ser todos iguais. */
export function isValidCep(value: string | null | undefined): boolean {
  const cep = onlyDigits(value)
  return cep.length === 8 && !/^0{8}$/.test(cep)
}

/**
 * Escolhe entre document (CPF) e company_document (CNPJ) conforme o que o
 * Melhor Envio espera: pessoa física manda só CPF, jurídica manda o CNPJ.
 * Documento que não passa no dígito é omitido — melhor faltar campo do que
 * ter o pedido recusado por dado inválido.
 */
export function meDocumentFields(
  cpfOuCnpj: string | null | undefined
): { document?: string; company_document?: string } {
  const digits = onlyDigits(cpfOuCnpj)
  if (digits.length === 14 && isValidCnpj(digits)) return { company_document: digits }
  if (digits.length === 11 && isValidCpf(digits)) return { document: digits }
  return {}
}
