import 'dotenv/config'
import { pool } from '../src/db.js'
import { syncGokupsKps } from '../src/services/kps-sync.service.js'

const main = async () => {
  await syncGokupsKps()
}

main()
  .catch((error) => {
    console.error('Gagal sinkronisasi GoKUPS:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end()
  })
