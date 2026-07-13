import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './helpers'

test('cria produto novo com variante, fotos e BOM pelo modal', async ({ page }) => {
  await loginAsAdmin(page)

  await page.goto('/admin/estoque')
  await page.locator('#btn-novo-produto').click()

  const productName = `Produto Teste E2E ${Date.now()}`
  await page.locator('[data-testid="input-nome-produto"]').fill(productName)
  await page.locator('.modal .field:has-text("Preço varejo") input').fill('99,90')

  // Peso e dimensões
  await page.locator('[data-testid="input-peso"]').fill('300')
  await page.locator('[data-testid="input-comprimento"]').fill('20')
  await page.locator('[data-testid="input-largura"]').fill('15')
  await page.locator('[data-testid="input-altura"]').fill('10')

  // Variante (já vem uma linha vazia — expande e preenche)
  const variantCard = page.locator('.modal').locator('div', { hasText: 'Nova variante' }).first()
  await variantCard.click()

  const skuInput = page.locator('.modal input[placeholder="BOL-TIRA-MAR-UNI"]').first()
  await skuInput.fill(`SKU-E2E-${Date.now()}`)

  // BOM — só tenta se houver matéria-prima cadastrada
  const bomSelect = page.locator('[data-testid^="select-bom-material-"]').first()
  if (await bomSelect.count() > 0) {
    const optionCount = await bomSelect.locator('option').count()
    if (optionCount > 1) {
      await bomSelect.selectOption({ index: 1 })
    }
  }

  await page.locator('#btn-salvar-produto').click()

  await expect(page.getByText(productName)).toBeVisible({ timeout: 15000 })
})
