import { expect, test, type BrowserContext, type Page } from '@playwright/test'

async function enterGame(page: Page, name: string): Promise<void> {
  await page.goto('/lobbies')
  await page.getByPlaceholder('Votre nom...').fill(name)
  await expect(page.getByRole('button', { name: '➕ Créer une partie' })).toBeEnabled()
  await page.getByRole('button', { name: '➕ Créer une partie' }).click()
  await expect(page.getByRole('heading', { name: "Salle d'Attente" })).toBeVisible()
}

test('runs the complete production game flow with private views and V3 rules', async ({ browser, request }) => {
  const contexts: BrowserContext[] = []
  try {
    const homeContext = await browser.newContext()
    contexts.push(homeContext)
    const home = await homeContext.newPage()
    await home.goto('/')
    await expect(home.locator('.app-home-action')).toHaveText([
      '🎮 Créer / Rejoindre la partie',
      '📜 Règles',
      '🧪 Simulateur',
      '📚 Wiki des règles',
    ])
    await expect(home.locator('#lobbies-btn')).toHaveAttribute('href', '/lobbies')
    await expect(home.getByRole('link', { name: '📜 Règles' })).toHaveAttribute('href', '/rules')
    await expect(home.getByRole('link', { name: '📚 Wiki des règles' })).toHaveAttribute('href', 'https://wiki.bloodontheclocktower.com/Trouble_Brewing')

    const rules = await homeContext.newPage()
    await rules.goto('/rules')
    await expect(rules).toHaveTitle(/Référence/)
    await expect(rules.getByText('Fiche de référence')).toBeVisible()
    const rolePage = await homeContext.newPage()
    await rolePage.goto('/rules/role/voyante')
    await expect(rolePage).toHaveTitle(/Voyante — Loup Garou Ultime/)
    await expect(rolePage.getByRole('heading', { name: 'Voyante' })).toBeVisible()
    for (const assetPath of ['/images/voyante.webp']) {
      expect((await request.get(assetPath)).status(), assetPath).toBe(200)
    }

    const hostContext = await browser.newContext()
    contexts.push(hostContext)
    const host = await hostContext.newPage()
    await enterGame(host, 'Le MJ')
    await expect(host.getByText('Le MJ').first()).toBeVisible()

    const playerPages: Page[] = []
    for (let index = 1; index <= 5; index += 1) {
      const context = await browser.newContext()
      contexts.push(context)
      const page = await context.newPage()
      await enterGame(page, `Joueur ${index}`)
      playerPages.push(page)
    }

    await expect(host.locator('.app-player-card')).toHaveCount(6)
    await expect(host.getByRole('button', { name: '🎮 Démarrer la Partie' })).toBeEnabled()

    await playerPages[0]!.reload()
    await expect(playerPages[0]!.getByRole('heading', { name: "Salle d'Attente" })).toBeVisible()
    await expect(playerPages[0]!.getByText('Joueur 1').first()).toBeVisible()
    await expect(playerPages[0]!.locator('.app-player-card')).toHaveCount(6)

    await host.getByRole('button', { name: '🎮 Démarrer la Partie' }).click()
    await expect(host.getByRole('heading', { name: '👑 Maître du Jeu' })).toBeVisible()
    await expect(host.locator('.app-gm-table tbody tr')).toHaveCount(5)
    await expect(host.getByText("Vue d'ensemble de tous les rôles")).toBeVisible()

    for (const [index, page] of playerPages.entries()) {
      await expect(page.getByRole('heading', { name: 'Votre Rôle', exact: true })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Votre Pouvoir', exact: true })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Autres Infos', exact: true })).toBeVisible()
      await expect(page.getByText("Vue d'ensemble de tous les rôles")).toHaveCount(0)
      await expect(page.locator('.app-drunk-badge')).toHaveCount(0)
      await expect(page.locator('.app-gm-detail-card.decoy')).toHaveCount(0)
      await expect(page.getByLabel('Lien privé vers cette vue')).toHaveCount(0)
      await expect(page.locator('.sr-only')).toContainText(`Joueur ${index + 1}`)
    }

    await playerPages[0]!.reload()
    await expect(playerPages[0]!.getByRole('heading', { name: 'Votre Rôle', exact: true })).toBeVisible()
    await expect(playerPages[0]!.locator('.sr-only')).toContainText('Joueur 1')
    await expect(playerPages[0]!.getByLabel('Lien privé vers cette vue')).toHaveCount(0)

  } finally {
    for (const context of contexts) {
      await context.close().catch(() => undefined)
    }
  }
})
