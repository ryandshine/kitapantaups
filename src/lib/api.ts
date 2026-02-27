const API_URL = import.meta.env.VITE_API_URL

if (!API_URL) {
  console.warn('VITE_API_URL is not defined. API calls might fail.')
}

function getToken(): string | null {
  return localStorage.getItem('access_token')
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('access_token', accessToken)
  localStorage.setItem('refresh_token', refreshToken)
}

export function clearTokens() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refresh_token')
  if (!refreshToken) return null

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
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

  let res = await fetch(`${API_URL}${path}`, { ...options, headers })

  if (
    res.status === 401 &&
    allowRetry &&
    path !== '/auth/login' &&
    path !== '/auth/refresh'
  ) {
    const nextAccessToken = await refreshAccessToken()
    if (nextAccessToken) {
      const retryHeaders: Record<string, string> = {
        ...headers,
        Authorization: `Bearer ${nextAccessToken}`,
      }
      res = await fetch(`${API_URL}${path}`, { ...options, headers: retryHeaders })
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
