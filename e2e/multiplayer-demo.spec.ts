import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test'

// Helper to extract lobby ID from invite link on the page
async function getInviteLobbyId(page: Page): Promise<string | null> {
  const inviteInput = page.getByLabel('Lien d\'invitation')
  const inviteUrl = await inviteInput.inputValue()
  if (!inviteUrl) return null
  const match = inviteUrl.match(/(?:lobby\/|lobby=)([a-zA-Z0-9_-]+)/)
  return match ? match[1] : null
}

test('demo: launch game with 1 host and 12 players joining the same lobby', async ({ browser }) => {
  const contexts: BrowserContext[] = []

  try {
    // Create a SINGLE shared context - all pages will be tabs in the SAME browser window
    const sharedContext = await browser.newContext()
    contexts.push(sharedContext)

    // Create host page (first tab)
    const host = await sharedContext.newPage()

    // Host creates a new lobby
    await host.goto('/lobbies')
    await host.getByPlaceholder('Votre nom...').fill('Game Master')
    await host.getByRole('button', { name: '➕ Créer une partie' }).click()

    // Wait for host to be in lobby and get the lobby ID
    await expect(host.getByRole('heading', { name: 'Lobby' })).toBeVisible()

    // Extract lobby ID from the invite link
    const lobbyId = await getInviteLobbyId(host)
    expect(lobbyId).toBeTruthy()

    test.info().annotations.push({
      type: 'note',
      description: `Created lobby with ID: ${lobbyId}`
    })

    // Create players that join the SAME lobby in NEW TABS (same window)
    const players: Page[] = []
    for (let i = 1; i <= 12; i++) {
      // Create a new page in the SAME context (new tab in the same window)
      const playerPage = await sharedContext.newPage()

      // Navigate directly to the lobby join URL
      await playerPage.goto(`/lobby/${lobbyId}`)

      // Enter player name and join
      await playerPage.getByPlaceholder('Votre nom...').fill(`Hustler ${i}`)
      await playerPage.getByRole('button', { name: 'Rejoindre la partie' }).click()

      // Wait for player to be in the lobby
      await expect(playerPage.getByRole('heading', { name: 'Lobby' })).toBeVisible()

      players.push(playerPage)

      test.info().annotations.push({
        type: 'note',
        description: `Player ${i} joined the game`
      })
    }

    // Verify all players are in the same lobby
    for (const player of players) {
      await expect(player.getByRole('heading', { name: 'Lobby' })).toBeVisible()
      // Should see the host
      await expect(player.getByText('Game Master')).toBeVisible()
    }

    // Verify host sees all players
    for (let i = 1; i <= 12; i++) {
      await expect(host.getByText(`Hustler ${i}`, { exact: true })).toBeVisible()
    }

    test.info().annotations.push({
      type: 'note',
      description: `Successfully created game with 1 host and ${players.length} players in the same lobby`
    })

    // Host starts the game
    await host.getByRole('button', { name: '🎮 Démarrer la Partie' }).click()

    // Wait for start preview panel to appear
    await expect(host.getByText('Vérifiez les rôles avant de lancer')).toBeVisible()

    // Host confirms the role distribution
    await host.getByRole('button', { name: '✅ Confirmer et lancer' }).click()

    // Wait for game master view to appear
    await expect(host.getByRole('heading', { name: '👑 Maître du Jeu' })).toBeVisible()

    // Wait for host dashboard to appear
    await expect(host.getByText("Vue d'ensemble de tous les rôles")).toBeVisible()

    test.info().annotations.push({
      type: 'note',
      description: `Game started successfully! Host is Maître du Jeu with full dashboard. Players should see their role assignments in their respective tabs.`
    })

    // Pause to keep browser open in headed mode
    // Run with: npx playwright test --config playwright.demo.config.ts --headed
    if (process.env.PLAYWRIGHT_DEMO_PAUSE === 'true') await host.pause()

  } finally {
    // Clean up contexts (only if not paused)
    for (const context of contexts) {
      await context.close().catch(() => { })
    }
  }
})
