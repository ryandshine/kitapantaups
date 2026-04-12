import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pool } from '../src/db.js'

const fileArg = process.argv[2]

if (!fileArg) {
  console.error('Usage: tsx scripts/run_sql_file.ts <path-to-sql-file>')
  process.exit(1)
}

const run = async () => {
  const sqlPath = resolve(process.cwd(), fileArg)
  const sql = await readFile(sqlPath, 'utf8')
  await pool.query(sql)
  console.log(`Executed SQL file: ${sqlPath}`)
}

run()
  .catch((error) => {
    console.error('Failed to execute SQL file:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end()
  })
