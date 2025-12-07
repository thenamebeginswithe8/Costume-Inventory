import { createClient } from '@supabase/supabase-js'

// Replace these with your Supabase project details
const SUPABASE_URL = 'https://unukitvyqwdegltmjqze.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVudWtpdHZ5cXdkZWdsdG1qcXplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMjg0NzIsImV4cCI6MjA4MDcwNDQ3Mn0.qQkxY9XsIinWWKTcUuTWzECG4VU87IspeZV1ntlAM1E'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
