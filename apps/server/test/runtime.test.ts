import { EventEmitter } from 'node:events'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'
import { io as createSocketClient } from 'socket.io-client'

import { createServerRuntime } from '../src/runtime'
import { installShutdownHandlers } from '../src/shutdown'
import { createHttpApp } from '../src/transport/http-app'
import { createServiceForTest } from './support/runtime-fixture'

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})

async function createWebRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'lgu-web-'))
  temporaryDirectories.push(root)
  await mkdir(join(root, 'assets'), { recursive: true })
  await writeFile(join(root, 'index.html'), '<!doctype html><div id="app">V3</div>')
  await writeFile(join(root, 'assets', 'app.js'), 'globalThis.LGU = true')
  return root
}

describe('V3 production runtime', () => {
  it('serves built assets and SPA routes without masking APIs', async () => {
    const webRoot = await createWebRoot()
    const app = createHttpApp({
      service: createServiceForTest(),
      webOrigin: '*',
      webRoot,
    })

    const home = await app.inject({ method: 'GET', url: '/' })
    expect(home.statusCode).toBe(200)
    expect(home.headers['content-type']).toContain('text/html')
    expect(home.headers['cache-control']).toBe('no-cache')
    expect(home.body).toContain('<div id="app">V3</div>')

    const spaRoute = await app.inject({ method: 'GET', url: '/access' })
    expect(spaRoute.statusCode).toBe(200)
    expect(spaRoute.body).toContain('<div id="app">V3</div>')

    const deletedStaticPage = await app.inject({ method: 'GET', url: '/reference.html' })
    expect(deletedStaticPage.statusCode).toBe(404)

    const asset = await app.inject({ method: 'GET', url: '/assets/app.js' })
    expect(asset.statusCode).toBe(200)
    expect(asset.headers['content-type']).toContain('text/javascript')
    expect(asset.body).toContain('globalThis.LGU')

    const missingAsset = await app.inject({ method: 'GET', url: '/assets/missing.js' })
    expect(missingAsset.statusCode).toBe(404)
    expect(missingAsset.body).not.toContain('<div id="app">')

    const unknownApi = await app.inject({ method: 'GET', url: '/api/not-found' })
    expect(unknownApi.statusCode).toBe(404)
    expect(unknownApi.body).not.toContain('<div id="app">')

    await app.close()
  })

  it('disconnects an active Socket.IO client and closes the runtime idempotently', async () => {
    const runtime = createServerRuntime({ webOrigin: '*', logger: false, webRoot: undefined })
    const address = await runtime.app.listen({ host: '127.0.0.1', port: 0 })
    const client = createSocketClient(address, { transports: ['websocket'], forceNew: true })
    await new Promise<void>((resolve, reject) => {
      client.once('connect', () => resolve())
      client.once('connect_error', reject)
    })
    const disconnected = new Promise<void>((resolve) => client.once('disconnect', () => resolve()))

    const firstClose = runtime.close()
    const secondClose = runtime.close()
    expect(secondClose).toBe(firstClose)
    await Promise.all([firstClose, disconnected])

    expect(runtime.app.server.listening).toBe(false)
    expect(client.connected).toBe(false)
  })

  it('sets a non-zero exit code when graceful shutdown fails', async () => {
    const processLike = new EventEmitter() as unknown as NodeJS.Process
    processLike.exitCode = undefined
    const handlers = installShutdownHandlers(async () => Promise.reject(new Error('close failed')), processLike)

    await handlers.shutdown()

    expect(processLike.exitCode).toBe(1)
    handlers.dispose()
  })

  it('coalesces SIGINT, SIGTERM and direct shutdown into one close', async () => {
    const processLike = new EventEmitter() as unknown as NodeJS.Process
    processLike.exitCode = undefined
    const close = vi.fn(async () => undefined)
    const handlers = installShutdownHandlers(close, processLike)

    processLike.emit('SIGINT')
    processLike.emit('SIGTERM')
    await handlers.shutdown()

    expect(close).toHaveBeenCalledTimes(1)
    handlers.dispose()
  })
})
