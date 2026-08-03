import { createServerRuntime } from './runtime'

const port = Number(process.env.PORT ?? 3001)
const host = process.env.HOST ?? '0.0.0.0'
const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:5173'

const { app } = createServerRuntime({ webOrigin, logger: true })
await app.listen({ port, host })
