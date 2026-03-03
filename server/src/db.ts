import pg from 'pg'

const { Pool } = pg

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  // Swarm/overlay network can have transient latency spikes; 2s is too aggressive.
  connectionTimeoutMillis: 10000,
  keepAlive: true,
})

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err)
})
