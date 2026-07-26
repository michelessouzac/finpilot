import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://bjpwaonjqhpvnthuqzmo.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHdhb25qcWhwdm50aHVxem1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwMDEyMzgsImV4cCI6MjEwMDU3NzIzOH0.1qgFr_jn-XZmHkcnx1VXCCxW9cmRuXigWecKRP-7TPA'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
