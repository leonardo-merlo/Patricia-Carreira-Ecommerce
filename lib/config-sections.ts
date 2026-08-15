// As seções de Configurações, num lugar só: a sidebar monta o popover a partir
// desta lista e cada rota existe por causa dela. Duas listas viravam duas
// verdades no dia em que uma seção nova entrasse.

export type ConfigSectionId =
  | 'perfil'
  | 'pagamentos'
  | 'envio'
  | 'fiscal'
  | 'estoque'
  | 'integracoes'
  | 'notificacoes'
  | 'banner'

export type ConfigSectionIcon =
  | 'store' | 'creditCard' | 'truck' | 'fileText' | 'box' | 'plug' | 'bell' | 'tag'

export const CONFIG_SECTIONS: Array<{
  id: ConfigSectionId
  label: string
  description: string
  icon: ConfigSectionIcon
}> = [
  { id: 'perfil',       label: 'Perfil da loja', description: 'Nome, contato, CNPJ e endereço', icon: 'store' },
  { id: 'pagamentos',   label: 'Pagamentos',     description: 'Mercado Pago e conta bancária',  icon: 'creditCard' },
  { id: 'envio',        label: 'Frete e envio',  description: 'Melhor Envio e frete grátis',    icon: 'truck' },
  { id: 'fiscal',       label: 'Fiscal / NF-e',  description: 'Focus NFe e emissão automática', icon: 'fileText' },
  { id: 'estoque',      label: 'Estoque',        description: 'Alertas e bloqueios de venda',   icon: 'box' },
  { id: 'integracoes',  label: 'Integrações',    description: 'Situação real de cada serviço',  icon: 'plug' },
  { id: 'notificacoes', label: 'Notificações',   description: 'E-mails e avisos do painel',     icon: 'bell' },
  { id: 'banner',       label: 'Banner da loja', description: 'Frases do topo do site',         icon: 'tag' },
]

export function configSectionHref(id: ConfigSectionId): string {
  return `/admin/config/${id}`
}
