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
  await expect(page.getByRole('heading', { name: 'POMaster Workbench' })).toBeVisible()

  // 3. The panel is the PR-1 read-only spike surface.
  await expect(page.getByText('PR-1 SPIKE · READ-ONLY')).toBeVisible()
})
