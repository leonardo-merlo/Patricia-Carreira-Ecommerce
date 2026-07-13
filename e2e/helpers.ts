import { test, type Page } from '@playwright/test'

/**
 * Loga como admin via /conta/entrar usando E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD.
 * Sem essas variáveis, os testes que dependem do painel /admin são pulados —
 * este projeto não tem storageState/credenciais de teste configuradas ainda.
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  const email = process.env.E2E_ADMIN_EMAIL
  const password = process.env.E2E_ADMIN_PASSWORD
  if (!email || !password) {
    test.skip(true, 'E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD não configurados — pulando teste de admin.')
    return
  }

  await page.goto('/conta/entrar')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.locator('#btn-entrar').click()
  await page.waitForURL(/\/admin/, { timeout: 15000 })
}
