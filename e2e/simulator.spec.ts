import { expect, test } from '@playwright/test'

test('runs the simulator without API, Socket.IO or persistent browser state', async ({ context, page }) => {
  await page.addInitScript(() => {
    const writes: string[] = []
    Object.defineProperty(window, '__lguStorageWrites', { value: writes })
    const originalSetItem = Storage.prototype.setItem
    Storage.prototype.setItem = function monitoredSetItem(key: string, value: string): void {
      writes.push(`${key}:${value}`)
      originalSetItem.call(this, key, value)
    }
  })

  const backendRequests: string[] = []
  const socketIoConnections: string[] = []
  page.on('request', (request) => {
    const pathname = new URL(request.url()).pathname
    if (pathname === '/api' || pathname.startsWith('/api/') || pathname === '/socket.io' || pathname.startsWith('/socket.io/')) {
      backendRequests.push(request.url())
    }
  })
  page.on('websocket', (socket) => {
    const pathname = new URL(socket.url()).pathname
    if (pathname === '/socket.io' || pathname.startsWith('/socket.io/')) {
      socketIoConnections.push(socket.url())
    }
  })

  await page.goto('/')
  await expect(page).toHaveURL(/\/simulator$/)
  await expect(page.getByRole('heading', { name: 'Simulateur V3' })).toBeVisible()
  await expect(page.getByText('aucun socket, aucune session, aucun appel API')).toBeVisible()

  await page.locator('#simulator-seed').fill('e2e-seed')
  await page.getByRole('button', { name: 'Générer', exact: true }).click()
  await expect(page.getByText('e2e-seed', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Vue MJ' }).click()
  await expect(page.getByText("Vue d'ensemble de tous les rôles")).toBeVisible()
  const firstPlayerValue = await page.getByLabel('Choisir une vue joueur').locator('option').nth(1).getAttribute('value')
  expect(firstPlayerValue).toBeTruthy()
  await page.getByLabel('Choisir une vue joueur').selectOption(firstPlayerValue!)
  await expect(page.getByRole('heading', { name: 'Votre Rôle', exact: true })).toBeVisible()

  expect(backendRequests).toEqual([])
  expect(socketIoConnections).toEqual([])
  expect(await context.cookies()).toEqual([])
  expect(await page.evaluate(async () => ({
    local: localStorage.length,
    session: sessionStorage.length,
    writes: (window as typeof window & { __lguStorageWrites: string[] }).__lguStorageWrites,
    indexedDatabases: 'databases' in indexedDB ? (await indexedDB.databases()).length : 0,
    caches: (await caches.keys()).length,
  }))).toEqual({ local: 0, session: 0, writes: [], indexedDatabases: 0, caches: 0 })
})
