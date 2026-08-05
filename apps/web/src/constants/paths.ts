export const appBaseUrl = import.meta.env.BASE_URL

export function appPath(path: string): string {
  const base = appBaseUrl.endsWith('/') ? appBaseUrl.slice(0, -1) : appBaseUrl
  return `${base}${path.startsWith('/') ? path : `/${path}`}` || '/'
}

export function appAsset(path: string): string {
  return appPath(path)
}
