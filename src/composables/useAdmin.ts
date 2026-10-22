import { ref } from 'vue'
import { supabase } from '../lib/supabase'

const email = ref<string | null>(null)
const isAdmin = ref(false)
let ready: Promise<void> | null = null

async function refresh(): Promise<void> {
  const { data } = await supabase.auth.getSession()
  email.value = data.session?.user.email ?? null
  if (!data.session) {
    isAdmin.value = false
    return
  }
  const { data: admin, error } = await supabase.rpc('is_admin')
  isAdmin.value = !error && admin === true
}

/**
 * Signed-in admin (Supabase Auth + public.admins). Shared state; `ready` resolves once the
 * stored session has been checked, so pages can wait for it before deciding what to show.
 */
export function useAdmin() {
  if (!ready) {
    ready = refresh().catch((e) => console.error(e))
    supabase.auth.onAuthStateChange((event) => {
      // Defer: calling Supabase inside this callback can deadlock the auth client.
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') setTimeout(() => void refresh(), 0)
    })
  }

  async function signIn(address: string, password: string): Promise<'ok' | 'invalid' | 'not-admin'> {
    const { error } = await supabase.auth.signInWithPassword({ email: address.trim(), password })
    if (error) return 'invalid'
    await refresh()
    return isAdmin.value ? 'ok' : 'not-admin'
  }

  async function signOut(): Promise<void> {
    await supabase.auth.signOut()
    await refresh()
  }

  return { email, isAdmin, ready, signIn, signOut }
}
