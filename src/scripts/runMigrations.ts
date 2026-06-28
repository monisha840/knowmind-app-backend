import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function runMigrations() {
  try {
    const migrationFile = path.join(__dirname, '../../migrations/001_initial_schema.sql')
    const sql = fs.readFileSync(migrationFile, 'utf-8')

    console.log('Running migration: 001_initial_schema.sql')
    const { error } = await supabase.rpc('exec', {
      sql_string: sql,
    })

    if (error) {
      console.error('Migration error:', error)
      process.exit(1)
    }

    console.log('✓ Migration applied successfully')
  } catch (err) {
    console.error('Error running migrations:', err)
    process.exit(1)
  }
}

runMigrations()
