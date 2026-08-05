import 'vue-router'

export {}

declare module 'vue-router' {
  interface RouteMeta {
    requiresSession?: boolean
    roleAccess?: boolean
    simulator?: boolean
  }
}
