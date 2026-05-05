import 'dotenv/config'
import bcrypt from 'bcryptjs'
import pg from 'pg'

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

async function verify(email: string, password: string) {
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email])
    const user = result.rows[0]

    if (!user) {
      console.log(`[FAILED] User not found: ${email}`)
      return
    }

    const isMatch = await bcrypt.compare(password, user.password_hash)
    console.log(`[${isMatch ? 'SUCCESS' : 'FAILED'}] Login for ${email}: ${isMatch ? 'Password matches' : 'Password DOES NOT match'}`)
    
    if (isMatch) {
        console.log(`        Details: ID=${user.id}, Role=${user.role}, Active=${user.is_active}`)
    }
  } catch (err: any) {
    console.error(`[ERROR] Testing ${email}:`, err.message)
  }
}

async function runTests() {
    console.log('--- VERIFYING LOGIN CREDENTIALS ---')
    await verify('riandiekop@gmail.com', 'Admin@123')
    console.log('-----------------------------------')
    await pool.end()
}

runTests()
