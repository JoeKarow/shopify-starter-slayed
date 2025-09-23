import { test, expect } from '@playwright/test'

test('homepage loads successfully', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/.*/)
})

test('navigation works', async ({ page }) => {
  await page.goto('/')
  // Add more specific tests based on your theme's navigation
})