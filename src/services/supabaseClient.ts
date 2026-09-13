import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://nphqigxlbygvomszdljk.supabase.co"
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5waHFpZ3hsYnlndm9tc3pkbGprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1Mjk5NzUsImV4cCI6MjEwNDEwNTk3NX0.1zPG1tHC4EkOm3FS6Uwg4MtXUMz4srmwL65a7a3vmw0"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
