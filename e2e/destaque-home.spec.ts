import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './helpers'

test('marca produto como destaque e confirma exibição na home', async ({ page }) => {
  await loginAsAdmin(page)

  await page.goto('/admin/estoque')

  // Edita o primeiro produto da lista
  await page.locator('.tbl tbody tr').first().locator('[title="Editar"]').click()

  const nameInput = page.locator('[data-testid="input-nome-produto"]')
  const productName = await nameInput.inputValue()

  await page.locator('[data-testid="checkbox-destaque"]').click()
  await page.locator('#btn-salvar-produto').click()
  await expect(page.locator('.modal-backdrop')).toHaveCount(0, { timeout: 15000 })

  await page.goto('/')
  await expect(page.getByText('Destaques')).toBeVisible()
  await expect(page.getByText(productName).first()).toBeVisible()
})
