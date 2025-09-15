import { supabase } from "@/config/supabase"
import type { AuthTokenResponsePassword } from "@supabase/supabase-js"


export const login = async (email: string, password: string) : Promise<AuthTokenResponsePassword> => {
    const response = await supabase.auth.signInWithPassword({
        email, password
    })
    return response
}