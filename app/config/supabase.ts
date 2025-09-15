import { createClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const publicKey = import.meta.env.VITE_SUPABASE_PUBLIC_KEY

if (!supabaseUrl || !publicKey) {
    throw new Error("Missing supabaseUrl or publickey")
}

const supabase = createClient(supabaseUrl, publicKey)

export { supabase }