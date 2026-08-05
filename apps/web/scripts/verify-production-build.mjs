import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const outputDirectory = resolve('dist')
const marker = (
  await readFile(resolve(outputDirectory, '.simulator-enabled'), 'utf8')
).trim()
if (marker === 'true') process.exit(0)

const assetsDirectory = resolve(outputDirectory, 'assets')
const files = await readdir(assetsDirectory)
for (const file of files.filter((name) => name.endsWith('.js'))) {
  if (file.toLocaleLowerCase().includes('simulator')) {
    throw new Error(
      `Production build unexpectedly contains simulator chunk ${file}`,
    )
  }
  const source = await readFile(resolve(assetsDirectory, file), 'utf8')
  if (
    source.includes('Simulateur V3')
    || source.includes('Outil de développement local')
  ) {
    throw new Error(
      `Production build unexpectedly contains simulator code in ${file}`,
    )
  }
}
