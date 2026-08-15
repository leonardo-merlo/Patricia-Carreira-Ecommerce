// Regra de senha do projeto, num lugar só. As telas de cadastro e de troca
// importam daqui para validar e para desenhar o medidor de força — duas cópias
// da regra viram duas regras diferentes no dia em que uma delas mudar.

export const PASSWORD_MIN_LENGTH = 8

// Conjunto explícito. `/[^A-Za-z0-9]/` pareceria mais simples, mas aceitaria
// "senhá" como tendo caractere especial, porque o "á" não é ASCII alfanumérico.
const SPECIAL_CHARS = /[!@#$%^&*()\-_=+[\]{};:'",.<>/?\\|`~]/

export type PasswordRequirementId = 'length' | 'lowercase' | 'uppercase' | 'number' | 'special'

export const PASSWORD_REQUIREMENTS: Array<{
  id: PasswordRequirementId
  label: string
  test: (password: string) => boolean
}> = [
  { id: 'length',    label: `Pelo menos ${PASSWORD_MIN_LENGTH} caracteres`, test: (p) => p.length >= PASSWORD_MIN_LENGTH },
  { id: 'lowercase', label: 'Uma letra minúscula',                          test: (p) => /[a-z]/.test(p) },
  { id: 'uppercase', label: 'Uma letra maiúscula',                          test: (p) => /[A-Z]/.test(p) },
  { id: 'number',    label: 'Um número',                                    test: (p) => /[0-9]/.test(p) },
  { id: 'special',   label: 'Um caractere especial (!@#$…)',                test: (p) => SPECIAL_CHARS.test(p) },
]

export type PasswordStrengthLevel = 'muito-fraca' | 'fraca' | 'boa' | 'forte'

export type PasswordCheck = {
  /** Todos os requisitos atendidos. */
  valid: boolean
  met: PasswordRequirementId[]
  missing: PasswordRequirementId[]
  /** 0 a 5 — quantos requisitos a senha cumpre. */
  score: number
  level: PasswordStrengthLevel
  levelLabel: string
}

const LEVEL_LABEL: Record<PasswordStrengthLevel, string> = {
  'muito-fraca': 'Muito fraca',
  'fraca': 'Fraca',
  'boa': 'Boa',
  'forte': 'Forte',
}

export function checkPassword(password: string): PasswordCheck {
  const met: PasswordRequirementId[] = []
  const missing: PasswordRequirementId[] = []

  for (const req of PASSWORD_REQUIREMENTS) {
    if (req.test(password)) met.push(req.id)
    else missing.push(req.id)
  }

  const score = met.length
  const valid = missing.length === 0

  // Cumprir tudo com o mínimo de caracteres é "boa"; "forte" pede folga no
  // comprimento, que é o que de fato encarece um ataque de força bruta.
  let level: PasswordStrengthLevel
  if (valid && password.length >= 12) level = 'forte'
  else if (valid) level = 'boa'
  else if (score >= 3) level = 'fraca'
  else level = 'muito-fraca'

  return { valid, met, missing, score, level, levelLabel: LEVEL_LABEL[level] }
}

/** Mensagem pronta para exibir, ou null se a senha passa. */
export function passwordError(password: string): string | null {
  const check = checkPassword(password)
  if (check.valid) return null

  const labels = PASSWORD_REQUIREMENTS
    .filter((r) => check.missing.includes(r.id))
    .map((r) => r.label.toLowerCase())

  return `A senha precisa de: ${labels.join(', ')}.`
}
