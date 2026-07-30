export interface HealthResponse {
  app: 'loup-garou-ultimate'
  version: string
  status: 'ok'
}

export interface SystemReadyEvent {
  message: string
}

export interface ServerToClientEvents {
  'system:ready': (event: SystemReadyEvent) => void
}

export interface ClientToServerEvents {}
