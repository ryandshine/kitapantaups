import pg from 'pg'

const { Pool } = pg

let connectionString = process.env.DATABASE_URL

if (connectionString) {
  // Strip potentially conflicting query parameters if we're providing our own SSL config
  const url = new URL(connectionString)
  if (url.searchParams.has('sslmode')) {
    console.log(`Note: Original DATABASE_URL had sslmode=${url.searchParams.get('sslmode')}. Forcing manual SSL config.`)
    url.searchParams.delete('sslmode')
    connectionString = url.toString()
  }
}

if (!connectionString) {
  console.error('DATABASE_URL is not defined in environment variables!')
} else {
  const parsedUrl = new URL(connectionString)
  const maskedUrl = `${parsedUrl.protocol}//${parsedUrl.username ? `${parsedUrl.username}:****@` : ''}${parsedUrl.host}${parsedUrl.pathname}`
  console.log(`Connecting to database: ${maskedUrl}`)
}

const isProduction = process.env.NODE_ENV === 'production'
const useSSL = process.env.DB_SSL === 'true'

console.log(`Database Config: NODE_ENV=${process.env.NODE_ENV}, SSL_REQUIRED=${useSSL}`)

export const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
})

// Test connection on startup
pool.query('SELECT 1')
  .then(() => console.log('Database connectivity verified on startup'))
  .catch((err) => {
    console.error('DATABASE CONNECTIVITY ERROR ON STARTUP:', {
      message: err.message,
      code: err.code,
      stack: err.stack,
      detail: err.detail
    })
  })

pool.on('connect', (client) => {
  console.log('New database client connected to pool')
})

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', {
    message: err.message,
    stack: err.stack,
    cause: err.cause
  })
})
