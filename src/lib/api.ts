const rawApiUrl = import.meta.env.VITE_API_URL
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
const productionUrl = 'https://api-kitapantaups.ditpps.com'
const defaultUrl = isLocal ? 'http://localhost:3001' : productionUrl
export const API_URL = (rawApiUrl && rawApiUrl !== 'undefined' && rawApiUrl !== '') 
  ? rawApiUrl.replace(/\/$/, '') 
  : defaultUrl

if (!API_URL) {
  console.warn('VITE_API_URL is not defined. API calls will fail if not using relative paths.')
}

let accessToken: string | null = null

const isNetworkError = (error: unknown): error is TypeError =>
  error instanceof TypeError &&
  (error.message === 'Failed to fetch' || error.message.includes('NetworkError'))

const getErrorDetails = (error: unknown) => {
  if (error instanceof Error) {
    return {
      error,
      message: error.message,
      stack: error.stack,
    }
  }
  return {
    error,
    message: String(error),
    stack: undefined,
  }
}

export function getAccessToken(): string | null {
  return accessToken
}

export function setTokens(nextAccessToken: string) {
  accessToken = nextAccessToken
}

export function clearTokens() {
  accessToken = null
}

export async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({}),
    })

    if (!res.ok) return null
    const data = await res.json().catch(() => null)
    const nextAccessToken = data?.access_token
    if (!nextAccessToken) return null

    accessToken = nextAccessToken
    return nextAccessToken
  } catch {
    return null
  }
}

export async function authorizedFetch(input: string, options: RequestInit = {}, allowRetry = true): Promise<Response> {
  const token = getAccessToken()
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const fullUrl = /^https?:\/\//i.test(input)
    ? input
    : `${API_URL}${input.startsWith('/') ? input : `/${input}`}`

  let res: Response
  try {
    res = await fetch(fullUrl, {
      ...options,
      headers,
      credentials: options.credentials ?? 'include',
    })
  } catch (err: unknown) {
    console.error('Authorized Fetch Error:', err)
    if (isNetworkError(err)) {
      throw new Error(`Gagal terhubung ke API: ${fullUrl}.`)
    }
    throw err
  }

  if (res.status === 401 && allowRetry) {
    const nextAccessToken = await refreshAccessToken()
    if (nextAccessToken) {
      const retryHeaders: Record<string, string> = {
        ...headers,
        Authorization: `Bearer ${nextAccessToken}`,
      }
      res = await fetch(fullUrl, {
        ...options,
        headers: retryHeaders,
        credentials: options.credentials ?? 'include',
      })
    } else {
      clearTokens()
      throw new Error('Sesi login habis. Silakan login ulang.')
    }
  }

  return res
}

export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}, allowRetry = true): Promise<T> {
  const token = getAccessToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const fullUrl = `${API_URL}${normalizedPath}`

  let res: Response
  try {
    console.debug(`API Request: ${options.method || 'GET'} ${fullUrl}`)
    res = await fetch(fullUrl, { ...options, headers, credentials: 'include' })
  } catch (err: unknown) {
    const details = getErrorDetails(err)
    console.error('API Fetch Error Details:', {
      url: fullUrl,
      method: options.method || 'GET',
      error: details.error,
      message: details.message,
      stack: details.stack
    })
    
    if (isNetworkError(err)) {
      throw new Error(`Gagal terhubung ke API: ${fullUrl}. Periksa koneksi internet, sertifikat SSL, atau status server (CORS/Down).`)
    }
    throw err
  }

  if (
    res.status === 401 &&
    allowRetry &&
    normalizedPath !== '/auth/login' &&
    normalizedPath !== '/auth/refresh'
  ) {
    const nextAccessToken = await refreshAccessToken()
    if (nextAccessToken) {
      const retryHeaders: Record<string, string> = {
        ...headers,
        Authorization: `Bearer ${nextAccessToken}`,
      }
      try {
        res = await fetch(fullUrl, { ...options, headers: retryHeaders, credentials: 'include' })
      } catch (err: unknown) {
        console.error('API Retry Fetch Error:', err)
        if (err instanceof TypeError && err.message === 'Failed to fetch') {
          throw new Error(`Gagal terhubung ke API saat mencoba ulang (${fullUrl}).`)
        }
        throw err
      }
    } else {
      clearTokens()
      throw new Error('Sesi login habis. Silakan login ulang.')
    }
  }

  if (!res.ok) {
    let errMessage = `HTTP ${res.status}`
    try {
      const errBody = await res.json()
      // Handle various error formats:
      // - { error: string }  — standard API error
      // - { message: string } — some frameworks
      // - { success: false, error: ZodError } — Hono zod-validator
      if (typeof errBody?.error === 'string') {
        errMessage = errBody.error
      } else if (typeof errBody?.message === 'string') {
        errMessage = errBody.message
      } else if (errBody?.error?.issues) {
        // Zod validation error: format the first issue into readable text
        const issues = errBody.error.issues as { path: string[]; message: string }[]
        errMessage = issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')
      } else if (typeof errBody === 'string') {
        errMessage = errBody
      }
    } catch {
      errMessage = res.statusText || errMessage
    }
    throw new Error(errMessage)
  }

  if (res.status === 204) return null as T
  return res.json() as Promise<T>
}

export const api = {
  get: <T = unknown>(path: string) => apiFetch<T>(path),
  post: <T = unknown>(path: string, body: unknown) => apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T = unknown>(path: string, body: unknown) => apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put: <T = unknown>(path: string, body: unknown) => apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T = unknown>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
}
