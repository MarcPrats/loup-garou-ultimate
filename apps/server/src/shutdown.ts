export interface ShutdownHandlers {
  shutdown(): Promise<void>
  dispose(): void
}

export function installShutdownHandlers(
  close: () => Promise<void>,
  processLike: NodeJS.Process = process,
): ShutdownHandlers {
  let shutdownPromise: Promise<void> | null = null

  const shutdown = (): Promise<void> => {
    shutdownPromise ??= close().catch((error: unknown) => {
      processLike.exitCode = 1
      void error
    })
    return shutdownPromise
  }
  const signalHandler = (): void => {
    void shutdown()
  }

  processLike.once('SIGINT', signalHandler)
  processLike.once('SIGTERM', signalHandler)

  return {
    shutdown,
    dispose() {
      processLike.off('SIGINT', signalHandler)
      processLike.off('SIGTERM', signalHandler)
    },
  }
}
