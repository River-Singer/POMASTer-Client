import { expect, test } from '@playwright/test'

const TOKEN = process.env.DSH_TOKEN ?? ''

test('POMaster sidebar entry opens the Workbench panel', async ({ page }) => {
  await page.goto(`/?token=${TOKEN}`)

  // 1. The plugin contributed its sidebar entry (slot sidebar.panellist).
  // Locale-agnostic: the label comes from our locale dict (zh 工作台 / en Workbench).
  const entry = page.getByRole('navigation', { name: /Global panels|全局面板/ }).getByRole('button', { name: /POMaster/ })
  await expect(entry).toBeVisible({ timeout: 30_000 })

  // 2. Clicking it opens our own main-column surface (slot main, keyed panel).
  await entry.click()
  await expect(page.locator('.pmwb-tabs')).toBeVisible({ timeout: 15_000 })
  // 3. Same-source contract footer — locale-agnostic (zh 同源契约 / en same-source contract).
  await expect(page.locator('.pmwb')).toContainText(/same-source contract|同源契约/)
})

test('every Workbench tab renders through the host data channel', async ({ page }) => {
  await page.goto(`/?token=${TOKEN}`)
  const entry = page.getByRole('navigation', { name: /Global panels|全局面板/ }).getByRole('button', { name: /POMaster/ })
  await expect(entry).toBeVisible({ timeout: 30_000 })
  await entry.click()
  const firstTab = page.locator('.pmwb-tab').first()
  await expect(firstTab).toBeVisible({ timeout: 30_000 })

  // iterate tabs by index — labels are locale-dependent (zh/en)
  const count = await page.locator('.pmwb-tab').count()
  for (let i = 0; i < count; i++) {
    await page.locator('.pmwb-tab').nth(i).click()
    await page.waitForTimeout(1200)
    await expect(page.locator('.pmwb')).toBeVisible()
    const fatal = page.locator('.pmwb-err', { hasText: /GET \/api|POST \/api|→ 404|→ 502/ })
    await expect(fatal).toHaveCount(0, { timeout: 3000 })
  }

  // Overview shows real projected state (language-independent values)
  await page.locator('.pmwb-tab').first().click()
  await expect(page.locator('.pmwb')).toContainText('pomaster client', { timeout: 10_000 })
  await expect(page.locator('.pmwb')).toContainText('confirmed')
})
