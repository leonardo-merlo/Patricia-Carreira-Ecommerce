// Os serviços de envio habilitados no contrato, na modalidade CONTRATO AG.
//
// AG é postagem em agência, que é como o Henrique opera — ele não tem coleta.
// Os códigos vieram da consulta a
// GET /meucontrato/v1/empresas/{cnpj}/contratos/{n}/servicos: são os que este
// contrato de fato tem, não o catálogo geral dos Correios.
//
// `company` e `name` são o vocabulário que já está salvo em
// `store_settings.enabled_carriers` ("Correios (PAC)"). Batendo com o que está
// lá, o filtro do carrinho continua valendo sem migration de dado.

export type CorreiosService = {
  /** coProduto na API */
  code: string
  name: string
}

export const CORREIOS_COMPANY = 'Correios'

export const CORREIOS_SERVICES: readonly CorreiosService[] = [
  { code: '03298', name: 'PAC' },
  { code: '03220', name: 'SEDEX' },
  // Mini Envios recusa acima de ~24×16×4 cm com ERP-008. A recusa é esperada e
  // não é falha: o serviço simplesmente sai da lista daquele carrinho.
  { code: '04227', name: 'Mini Envios' },
]
