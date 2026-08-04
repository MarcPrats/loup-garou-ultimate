// @vitest-environment node
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { backendProxy } from '../../vite.config'
import { ROUTE_NAME } from '../constants/app'
import { shouldRedirectToSimulator } from '../router'

describe('standalone simulator command', () => {
  it('starts Vite in simulator mode and opens the simulator route', async () => {
    const packageJson = JSON.parse(await readFile(resolve(process.cwd(), '../../package.json'), 'utf8')) as {
      scripts: Record<string, string>
    }

    expect(packageJson.scripts.simulator).toContain('dev --mode simulator')
    expect(packageJson.scripts.simulator).toContain('--open /simulator')
  })

  it('redirects every non-simulator route before session initialization', () => {
    expect(shouldRedirectToSimulator(true, ROUTE_NAME.HOME)).toBe(true)
    expect(shouldRedirectToSimulator(true, ROUTE_NAME.LOBBY)).toBe(true)
    expect(shouldRedirectToSimulator(true, ROUTE_NAME.SIMULATOR)).toBe(false)
    expect(shouldRedirectToSimulator(false, ROUTE_NAME.HOME)).toBe(false)
  })

  it('removes only backend proxies in simulator mode', () => {
    expect(backendProxy(true)).toEqual({})
    expect(backendProxy(false)).toMatchObject({
      '/api': 'http://localhost:3001',
      '/socket.io': { target: 'http://localhost:3001', ws: true },
    })
  })
})
