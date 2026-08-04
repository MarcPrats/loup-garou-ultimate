import { expect, test, type BrowserContext, type Page } from '@playwright/test'

async function enterGame(page: Page, name: string): Promise<void> {
  await page.goto('/waiting_room')
  await page.getByPlaceholder('Votre nom...').fill(name)
  await expect(page.getByRole('button', { name: 'Continuer' })).toBeEnabled()
  await page.getByRole('button', { name: 'Continuer' }).click()
  await expect(page.getByRole('heading', { name: "Salle d'Attente" })).toBeVisible()
}

test('runs the complete production game flow with private views and legacy rules', async ({ browser, request }) => {
  const contexts: BrowserContext[] = []
  try {
    const homeContext = await browser.newContext()
    contexts.push(homeContext)
    const home = await homeContext.newPage()
    await home.goto('/')
    await expect(home.locator('.legacy-home-action')).toHaveText([
      '🎮 Lancer la partie',
      '📜 Règles',
      '📚 Wiki des règles',
    ])
    await expect(home.locator('#entry-btn')).toHaveAttribute('href', '/waiting_room')
    await expect(home.getByRole('link', { name: '📜 Règles' })).toHaveAttribute('href', '/reference.html')
    await expect(home.getByRole('link', { name: '📚 Wiki des règles' })).toHaveAttribute('href', 'https://wiki.bloodontheclocktower.com/Trouble_Brewing')

    const rules = await homeContext.newPage()
    await rules.goto('/reference.html')
    await expect(rules).toHaveTitle(/Référence/)
    await expect(rules.getByText('Ordre de la première nuit')).toBeVisible()
    const rolePage = await homeContext.newPage()
    await rolePage.goto('/role.html?role=voyante')
    await expect(rolePage).toHaveTitle(/Voyante — Loup Garou Ultime/)
    await expect(rolePage.getByRole('heading', { name: 'Voyante' })).toBeVisible()
    for (const assetPath of ['/css/role-catalog.css', '/js/roles-data.js', '/js/reference-roles.js', '/js/role-detail.js', '/images/voyante.webp']) {
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

    await expect(host.locator('.legacy-player-card')).toHaveCount(6)
    await expect(host.getByRole('button', { name: '🎮 Démarrer la Partie' })).toBeEnabled()

    await playerPages[0]!.reload()
    await expect(playerPages[0]!.getByRole('heading', { name: "Salle d'Attente" })).toBeVisible()
    await expect(playerPages[0]!.getByText('Joueur 1').first()).toBeVisible()
    await expect(playerPages[0]!.locator('.legacy-player-card')).toHaveCount(6)

    await host.getByRole('button', { name: '🎮 Démarrer la Partie' }).click()
    await expect(host.getByRole('heading', { name: '👑 Maître du Jeu' })).toBeVisible()
    await expect(host.locator('.legacy-gm-table tbody tr')).toHaveCount(5)
    await expect(host.getByText("Vue d'ensemble de tous les rôles")).toBeVisible()

    const privateUrls: string[] = []
    for (const page of playerPages) {
      await expect(page.getByRole('heading', { name: 'Votre Rôle', exact: true })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Votre Pouvoir', exact: true })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Autres Infos', exact: true })).toBeVisible()
      await expect(page.getByText("Vue d'ensemble de tous les rôles")).toHaveCount(0)
      await expect(page.locator('.legacy-drunk-badge')).toHaveCount(0)
      await expect(page.locator('.legacy-gm-detail-card.decoy')).toHaveCount(0)
      privateUrls.push(await page.getByLabel('Lien privé vers cette vue').inputValue())
    }
    expect(new Set(privateUrls).size).toBe(5)

    for (const [index, privateUrl] of privateUrls.entries()) {
      const expectedPlayer = `Joueur ${index + 1}`
      const parsedPrivateUrl = new URL(privateUrl)
      expect(parsedPrivateUrl.pathname).toBe('/access')
      expect(parsedPrivateUrl.search).toBe('')
      expect(parsedPrivateUrl.hash.length).toBeGreaterThan(20)

      const token = decodeURIComponent(parsedPrivateUrl.hash.slice(1))
      const privateResponse = await request.get(`/api/role/${encodeURIComponent(token)}`)
      expect(privateResponse.status()).toBe(200)
      expect(privateResponse.headers()['cache-control']).toBe('no-store')
      expect(privateResponse.headers()['referrer-policy']).toBe('no-referrer')
      const privateBody = await privateResponse.json()
      expect(privateBody.view).toBe('player')
      expect(privateBody.assignment.player.name).toBe(expectedPlayer)
      expect(JSON.stringify(privateBody)).not.toContain('isDrunk')
      expect(JSON.stringify(privateBody)).not.toContain('isVoyanteDecoy')

      const directContext = await browser.newContext()
      contexts.push(directContext)
      const direct = await directContext.newPage()
      const browserRequestPromise = direct.waitForRequest((candidate) => candidate.url().includes('/api/role/'))
      const browserResponsePromise = direct.waitForResponse((candidate) => candidate.url().includes('/api/role/'))
      await direct.goto(privateUrl)
      const [browserRequest, browserResponse] = await Promise.all([browserRequestPromise, browserResponsePromise])
      await expect(direct.getByRole('heading', { name: 'Votre Rôle', exact: true })).toBeVisible()
      await expect(direct.locator('.sr-only')).toContainText(expectedPlayer)
      expect(direct.url()).toBe(privateUrl)
      expect(browserRequest.headers()['cookie']).toBeUndefined()
      expect(browserRequest.headers()['authorization']).toBeUndefined()
      expect(browserRequest.headers()['referer'] ?? '').toBe('')
      expect(browserResponse.headers()['cache-control']).toBe('no-store')
      expect(browserResponse.headers()['referrer-policy']).toBe('no-referrer')
      await directContext.close()
    }

    const originalPrivateUrl = privateUrls[0]!
    await playerPages[0]!.reload()
    await expect(playerPages[0]!.getByRole('heading', { name: 'Votre Rôle', exact: true })).toBeVisible()
    await expect(playerPages[0]!.locator('.sr-only')).toContainText('Joueur 1')
    await expect(playerPages[0]!.getByLabel('Lien privé vers cette vue')).toHaveValue(originalPrivateUrl)
  } finally {
    for (const context of contexts) {
      await context.close().catch(() => undefined)
    }
  }
})
