import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

const CONTENT_TYPE: Readonly<Record<string, string>> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function isApiOrSocketPath(pathname: string): boolean {
  return pathname === '/api'
    || pathname.startsWith('/api/')
    || pathname === '/socket.io'
    || pathname.startsWith('/socket.io/')
}

function safeFilePath(webRoot: string, pathname: string): string | null {
  let decodedPath: string
  try {
    decodedPath = decodeURIComponent(pathname)
  } catch {
    return null
  }
  const relativePath = decodedPath.replace(/^\/+/, '')
  const candidate = resolve(webRoot, relativePath)
  const normalizedRoot = resolve(webRoot)
  if (candidate !== normalizedRoot && !candidate.startsWith(`${normalizedRoot}${sep}`)) {
    return null
  }
  return candidate
}

async function regularFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile()
  } catch {
    return false
  }
}

async function sendFile(
  request: FastifyRequest,
  reply: FastifyReply,
  path: string,
): Promise<FastifyReply> {
  const extension = extname(path).toLowerCase()
  reply.type(CONTENT_TYPE[extension] ?? 'application/octet-stream')
  if (extension === '.html') reply.header('Cache-Control', 'no-cache')
  if (request.method === 'HEAD') return reply.send()
  return reply.send(createReadStream(path))
}

export function registerStaticWeb(
  app: FastifyInstance,
  webRoot: string | undefined,
): void {
  if (!webRoot) return

  app.setNotFoundHandler(async (request, reply) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return reply.code(404).send({ message: 'Route not found' })
    }
    const pathname = request.url.split(/[?#]/, 1)[0] ?? '/'
    if (isApiOrSocketPath(pathname)) {
      return reply.code(404).send({ message: 'Route not found' })
    }

    const requested = safeFilePath(webRoot, pathname === '/' ? '/index.html' : pathname)
    if (!requested) return reply.code(404).send({ message: 'Route not found' })
    if (await regularFile(requested)) return sendFile(request, reply, requested)

    if (extname(pathname)) {
      return reply.code(404).send({ message: 'Route not found' })
    }
    const spaIndex = resolve(webRoot, 'index.html')
    if (!(await regularFile(spaIndex))) {
      return reply.code(404).send({ message: 'Web application is not built' })
    }
    return sendFile(request, reply, spaIndex)
  })
}
