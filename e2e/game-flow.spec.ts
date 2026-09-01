import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test'

async function enterGame(page: Page, name: string): Promise<void> {
  await page.goto('/waiting_room')
  await page.getByPlaceholder('Votre nom...').fill(name)
  await expect(page.getByRole('button', { name: 'Continuer' })).toBeEnabled()
  await page.getByRole('button', { name: 'Continuer' }).click()
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
    await expect(home.locator('#entry-btn')).toHaveAttribute('href', '/waiting_room')
    await expect(home.getByRole('link', { name: '📜 Règles' })).toHaveAttribute('href', '/reference')
    await expect(home.getByRole('link', { name: '📚 Wiki des règles' })).toHaveAttribute('href', 'https://wiki.bloodontheclocktower.com/Trouble_Brewing')

    const rules = await homeContext.newPage()
    await rules.goto('/reference')
    await expect(rules).toHaveTitle(/Référence/)
    await expect(rules.getByText('Ordre de la première nuit')).toBeVisible()
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
    await expect(host.getByRole('heading', { name: 'Vérifiez les rôles avant de lancer' })).toBeVisible()
    await host.getByRole('button', { name: '✅ Confirmer et lancer' }).click()
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


interface VotingGame {
  contexts: BrowserContext[]
  host: Page
  players: Page[]
}

async function createVotingGame(browser: Browser, enabled: boolean): Promise<VotingGame> {
  const contexts: BrowserContext[] = []
  const hostContext = await browser.newContext()
  contexts.push(hostContext)
  const host = await hostContext.newPage()
  await enterGame(host, 'Le MJ')

  const players: Page[] = []
  for (let index = 1; index <= 5; index += 1) {
    const context = await browser.newContext()
    contexts.push(context)
    const page = await context.newPage()
    await enterGame(page, `Joueur ${index}`)
    players.push(page)
  }

  if (enabled) {
    const toggle = host.getByTestId('day-voting-toggle')
    await toggle.check()
    await expect(toggle).toBeChecked()
  }

  await host.getByRole('button', { name: '🎮 Démarrer la Partie' }).click()
  await expect(host.getByRole('heading', { name: 'Vérifiez les rôles avant de lancer' })).toBeVisible()
  await host.getByRole('button', { name: '✅ Confirmer et lancer' }).click()
  await expect(host.getByRole('heading', { name: '👑 Maître du Jeu' })).toBeVisible()
  await expect(players[0]!.getByRole('heading', { name: 'Votre Rôle', exact: true })).toBeVisible()

  return { contexts, host, players }
}

async function advanceToDay(host: Page, day = 1): Promise<void> {
  await host.getByTestId('advance-game-phase').click()
  await expect(host.getByTestId('game-phase-panel')).toContainText(`☀️ Jour ${day}`)
}

async function recordNightKill(host: Page, targetName: string): Promise<void> {
  await host.getByTestId('game-log-target').selectOption({ label: targetName })
  await host.getByTestId('record-game-log-event').click()
  await expect(host.getByTestId('game-log-entries')).toContainText(targetName)
}

async function nominate(page: Page, targetName: string): Promise<void> {
  await page.locator('#day-vote-target').selectOption({ label: targetName })
  await page.getByRole('button', { name: 'Nominer', exact: true }).click()
}

async function approveAndStartVote(host: Page): Promise<void> {
  await host.getByRole('button', { name: '✅ Valider' }).click()
  await host.getByRole('button', { name: '▶️ Lancer le compte à rebours' }).click()
}

async function submitVotes(
  players: Page[],
  choices: readonly ('yes' | 'no')[],
  voterIndexes = players.map((_, index) => index),
): Promise<void> {
  for (const index of voterIndexes) {
    const page = players[index]!
    await page.getByRole('button', { name: choices[index] === 'yes' ? '👍 Oui' : '👎 Non' }).click()
    if (index !== voterIndexes[voterIndexes.length - 1]) {
      await expect(page.getByText('Votre vote est enregistré.')).toBeVisible()
    }
  }
}

async function runVoteRound(
  host: Page,
  players: Page[],
  nominatorIndex: number,
  targetName: string,
  choices: readonly ('yes' | 'no')[],
  voterIndexes = players.map((_, index) => index),
): Promise<void> {
  await nominate(players[nominatorIndex]!, targetName)
  await approveAndStartVote(host)
  await submitVotes(players, choices, voterIndexes)
  await expect(host.getByTestId('day-voting-daily-summary')).toBeVisible()
}

test('hides the voting system when the MJ leaves it disabled', async ({ browser }) => {
  const game = await createVotingGame(browser, false)
  try {
    await advanceToDay(game.host)
    await expect(game.host.getByTestId('day-voting-panel')).toHaveCount(0)
    await expect(game.players[0]!.getByTestId('day-voting-panel')).toHaveCount(0)
  } finally {
    for (const context of game.contexts) await context.close().catch(() => undefined)
  }
})

test('runs a successful single nomination and leaves execution to the MJ', async ({ browser }) => {
  const game = await createVotingGame(browser, true)
  try {
    await advanceToDay(game.host)
    await runVoteRound(game.host, game.players, 0, 'Joueur 2', ['yes', 'yes', 'yes', 'no', 'no'])
    await expect(game.host.getByTestId('day-voting-daily-summary')).toContainText('Candidat retenu : Joueur 2')
    await expect(game.players[1]!.locator('.app-ghost-status-panel')).toHaveCount(0)

    await game.host.getByTestId('game-log-target').selectOption({ label: 'Joueur 2' })
    await game.host.getByTestId('record-game-log-event').click()
    await expect(game.players[1]!.locator('.app-ghost-status-panel')).toBeVisible()
  } finally {
    for (const context of game.contexts) await context.close().catch(() => undefined)
  }
})

test('runs a failed nomination and allows another nomination during the same day', async ({ browser }) => {
  const game = await createVotingGame(browser, true)
  try {
    await advanceToDay(game.host)
    await runVoteRound(game.host, game.players, 0, 'Joueur 2', ['yes', 'yes', 'no', 'no', 'no'])
    await expect(game.host.getByTestId('day-voting-daily-summary')).toContainText('Aucune nomination n’a atteint la majorité')

    await runVoteRound(game.host, game.players, 2, 'Joueur 4', ['yes', 'yes', 'no', 'no', 'no'])
    await expect(game.host.getByTestId('day-voting-daily-summary')).toContainText('Joueur 2 : 2 Oui')
    await expect(game.host.getByTestId('day-voting-daily-summary')).toContainText('Joueur 4 : 2 Oui')
    await expect(game.host.getByTestId('day-voting-daily-summary')).toContainText('Aucune nomination n’a atteint la majorité')
  } finally {
    for (const context of game.contexts) await context.close().catch(() => undefined)
  }
})

test('keeps several nominations and selects the highest qualifying vote', async ({ browser }) => {
  const game = await createVotingGame(browser, true)
  try {
    await advanceToDay(game.host)
    await runVoteRound(game.host, game.players, 0, 'Joueur 2', ['yes', 'yes', 'yes', 'no', 'no'])
    await runVoteRound(game.host, game.players, 2, 'Joueur 4', ['yes', 'yes', 'yes', 'yes', 'no'])

    await expect(game.host.getByTestId('day-voting-daily-summary')).toContainText('Candidat retenu : Joueur 4')
    await expect(game.host.getByTestId('day-voting-daily-summary')).toContainText('Joueur 2 : 3 Oui')
    await expect(game.host.getByTestId('day-voting-daily-summary')).toContainText('Joueur 4 : 4 Oui')
    await expect(game.players[3]!.locator('.app-ghost-status-panel')).toHaveCount(0)
  } finally {
    for (const context of game.contexts) await context.close().catch(() => undefined)
  }
})

test('does not select an execution when qualifying nominations are tied', async ({ browser }) => {
  const game = await createVotingGame(browser, true)
  try {
    await advanceToDay(game.host, 1)
    await runVoteRound(game.host, game.players, 0, 'Joueur 2', ['yes', 'no', 'no', 'no', 'yes'])

    await game.host.getByTestId('advance-game-phase').click()
    await expect(game.host.getByTestId('game-phase-panel')).toContainText('🌙 Nuit 2')
    await recordNightKill(game.host, 'Joueur 5')
    await advanceToDay(game.host, 2)

    await runVoteRound(game.host, game.players, 0, 'Joueur 2', ['yes', 'no', 'no', 'no', 'yes'])
    await game.host.getByTestId('advance-game-phase').click()
    await expect(game.host.getByTestId('game-phase-panel')).toContainText('🌙 Nuit 3')
    await recordNightKill(game.host, 'Joueur 4')
    await advanceToDay(game.host, 3)

    await runVoteRound(game.host, game.players, 1, 'Joueur 1', ['yes', 'yes', 'no', 'no'], [0, 1, 2, 3])
    await runVoteRound(game.host, game.players, 2, 'Joueur 2', ['yes', 'yes', 'no', 'no'], [0, 1, 2, 3])

    await expect(game.host.getByTestId('day-voting-daily-summary')).toContainText('Égalité entre plusieurs nominations')
    await expect(game.players[0]!.locator('.app-ghost-status-panel')).toHaveCount(0)
    await expect(game.players[1]!.locator('.app-ghost-status-panel')).toHaveCount(0)
  } finally {
    for (const context of game.contexts) await context.close().catch(() => undefined)
  }
})
