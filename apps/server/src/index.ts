import { createServerRuntime } from './runtime'
import { installShutdownHandlers } from './shutdown'

const port = Number(process.env.PORT ?? 3001)
const host = process.env.HOST ?? '0.0.0.0'
const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:5173'

const configuredWebRoot = process.env.WEB_ROOT?.trim()
const runtime = createServerRuntime({
  webOrigin,
  logger: true,
  ...(configuredWebRoot ? { webRoot: configuredWebRoot } : {}),
})
installShutdownHandlers(() => runtime.close())
await runtime.app.listen({ port, host })
