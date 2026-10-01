import { expect, test } from '@playwright/test'

const TOKEN = process.env.DSH_TOKEN ?? ''

const TABS = [
  'Overview', 'Tasks', 'Attention', 'Knowledge', 'Routing',
  'Topology', 'Verification', 'Evidence', 'Components', 'Actions',
]

test('POMaster sidebar entry opens the Workbench panel', async ({ page }) => {
  await page.goto(`/?token=${TOKEN}`)

  // 1. The plugin contributed its sidebar entry (slot sidebar.panellist).
  // Locale-agnostic: the label comes from our locale dict (zh 工作台 / en Workbench).
  const entry = page.getByRole('navigation', { name: /Global panels|全局面板/ }).getByRole('button', { name: /POMaster/ })
  await expect(entry).toBeVisible({ timeout: 30_000 })

  // 2. Clicking it opens our own main-column surface (slot main, keyed panel).
  await entry.click()
  await expect(page.locator('.pmwb-tabs')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('.pmwb')).toContainText('same-source contract with the pomaster CLI')
})

test('every Workbench tab renders through the host data channel', async ({ page }) => {
  await page.goto(`/?token=${TOKEN}`)
  const entry = page.getByRole('navigation', { name: /Global panels|全局面板/ }).getByRole('button', { name: /POMaster/ })
  await expect(entry).toBeVisible({ timeout: 30_000 })
  await entry.click()
  await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible({ timeout: 30_000 })

  for (const label of TABS) {
    await page.getByRole('tab', { name: label }).click()
    // each page mounts a refresh action or content — assert no fetch-failure banner
    await page.waitForTimeout(1200)
    const body = page.locator('.pmwb')
    await expect(body).toBeVisible()
    const fatal = page.locator('.pmwb-err', { hasText: /GET \/api|POST \/api|→ 404|→ 502/ })
    await expect(fatal).toHaveCount(0, { timeout: 3000 })
  }

  // Overview shows real projected state (same-source contract)
  await page.getByRole('tab', { name: 'Overview' }).click()
  await expect(page.getByText('pomaster client')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('confirmed')).toBeVisible()
})
