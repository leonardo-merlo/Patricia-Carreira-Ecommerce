import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './helpers'

test('cria pedido atacado com observação e confirma exibição no detalhe', async ({ page }) => {
  await loginAsAdmin(page)

  await page.goto('/admin/pedidos')
  await page.getByRole('button', { name: /Atacado/ }).click()
  await page.locator('#btn-novo-pedido-atacado').click()

  const notes = `Observação de teste E2E ${Date.now()}`
  await page.locator('.modal textarea[placeholder="Opcional..."]').fill(notes)

  await page.getByRole('button', { name: /Conferir disponibilidade|Avançar|Continuar/ }).first().click()

  // Etapa de confirmação final do pedido
  const confirmBtn = page.getByRole('button', { name: /Confirmar pedido|Criar pedido/ }).first()
  await confirmBtn.click()

  // Fecha o modal de resultado e expande o pedido recém-criado (primeiro da lista)
  await page.locator('.modal-backdrop').click({ position: { x: 5, y: 5 } }).catch(() => {})
  await page.locator('[data-testid="btn-ver-detalhes-atacado"]').first().click()

  await expect(page.locator('[data-testid="texto-observacoes-atacado"]').first()).toContainText(notes)
})
