import 'dotenv/config'
import { pool } from '../src/db.js'
import { syncGokupsKups } from '../src/services/kups-sync.service.js'

const main = async () => {
  await syncGokupsKups()
}

main()
  .catch((error) => {
    console.error('Gagal sinkronisasi GoKUPS KUPS:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end()
  })
