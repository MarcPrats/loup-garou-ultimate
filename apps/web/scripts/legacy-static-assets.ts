import type { Plugin } from 'vite'
import { readdirSync } from 'node:fs'
import { copyFile, mkdir, readFile } from 'node:fs/promises'
import { extname, resolve } from 'node:path'

const STATIC_FILES = [
  'role.html',
  'css/role-catalog.css',
  'js/roles-data.js',
  'js/reference-roles.js',
  'js/role-detail.js',
]

const CONTENT_TYPE: Readonly<Record<string, string>> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
}

export function legacyStaticAssets(repositoryRoot: string): Plugin {
  const imageFiles = readdirSync(resolve(repositoryRoot, 'images')).map((name) => `images/${name}`)
  const files = [...STATIC_FILES, ...imageFiles]
  const sources = new Map(files.map((file) => [`/${file}`, resolve(repositoryRoot, file)]))
  return {
    name: 'lgu-legacy-static-assets',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = request.url?.split(/[?#]/, 1)[0]
        const source = pathname ? sources.get(pathname) : undefined
        if (!source) return next()
        try {
          response.statusCode = 200
          response.setHeader('Content-Type', CONTENT_TYPE[extname(source)] ?? 'application/octet-stream')
          response.end(await readFile(source))
        } catch (error) {
          next(error)
        }
      })
    },
    async writeBundle(options) {
      const outputDirectory = resolve(process.cwd(), options.dir ?? 'dist')
      await Promise.all(files.map(async (file) => {
        const destination = resolve(outputDirectory, file)
        await mkdir(resolve(destination, '..'), { recursive: true })
        await copyFile(resolve(repositoryRoot, file), destination)
      }))
    },
  }
}
