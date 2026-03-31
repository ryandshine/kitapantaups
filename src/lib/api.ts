const rawApiUrl = import.meta.env.VITE_API_URL
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
const productionUrl = 'https://api-kitapantaups.ditpps.com'
const defaultUrl = isLocal ? 'http://localhost:3001' : productionUrl
const API_URL = (rawApiUrl && rawApiUrl !== 'undefined' && rawApiUrl !== '') 
  ? rawApiUrl.replace(/\/$/, '') 
  : defaultUrl

if (!API_URL) {
  console.warn('VITE_API_URL is not defined. API calls will fail if not using relative paths.')
}

function getToken(): string | null {
  return localStorage.getItem('access_token')
}

export function setTokens(accessToken: string) {
  localStorage.setItem('access_token', accessToken)
  localStorage.removeItem('refresh_token')
}

export function clearTokens() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

async function refreshAccessToken(): Promise<string | null> {
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

    localStorage.setItem('access_token', nextAccessToken)
    return nextAccessToken
  } catch {
    return null
  }
}

export async function apiFetch(path: string, options: RequestInit = {}, allowRetry = true): Promise<any> {
  const token = getToken()
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
  } catch (err: any) {
    console.error('API Fetch Error Details:', {
      url: fullUrl,
      method: options.method || 'GET',
      error: err,
      message: err.message,
      stack: err.stack
    })
    
    if (err.name === 'TypeError' && (err.message === 'Failed to fetch' || err.message.includes('NetworkError'))) {
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
      } catch (err: any) {
        console.error('API Retry Fetch Error:', err)
        if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
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

  if (res.status === 204) return null
  return res.json()
}

export const api = {
  get: (path: string) => apiFetch(path),
  post: (path: string, body: any) => apiFetch(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: (path: string, body: any) => apiFetch(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put: (path: string, body: any) => apiFetch(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path: string) => apiFetch(path, { method: 'DELETE' }),
}
