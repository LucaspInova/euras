import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const SUPABASE_REQUEST_TIMEOUT_MS = 30000
let refreshSessionPromise = null

function isTransientSupabaseError(error) {
  const message = String(error?.message ?? '').toLowerCase()
  return (
    message.includes('tempo limite') ||
    message.includes('failed to fetch') ||
    message.includes('network') ||
    message.includes('connection')
  )
}

function clearPersistedAuthTokens() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return
  }

  try {
    const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
    if (!projectRef) return

    window.localStorage.removeItem(`sb-${projectRef}-auth-token`)
  } catch {
    // Ignore storage access errors (private mode, blocked storage, etc.)
  }
}

async function fetchWithTimeout(input, init = {}) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), SUPABASE_REQUEST_TIMEOUT_MS)

  if (init.signal) {
    if (init.signal.aborted) {
      controller.abort()
    } else {
      init.signal.addEventListener('abort', () => controller.abort(), { once: true })
    }
  }

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    })
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Tempo limite de conexao com o Supabase excedido.')
    }

    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'As variaveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY precisam estar definidas.',
  )
}

clearPersistedAuthTokens()

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: fetchWithTimeout,
  },
  auth: {
    persistSession: false,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export async function ensureFreshSession({ minimumValiditySeconds = 90 } = {}) {
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    throw error
  }

  const currentSession = data.session
  if (!currentSession) {
    throw new Error('Sessao expirada. Faca login novamente.')
  }

  const expiresAt = Number(currentSession.expires_at ?? 0)
  const now = Math.floor(Date.now() / 1000)

  if (!expiresAt || expiresAt - now > minimumValiditySeconds) {
    return currentSession
  }

  if (!refreshSessionPromise) {
    refreshSessionPromise = (async () => {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const { data: refreshedData, error: refreshError } = await supabase.auth.refreshSession()

        if (refreshError) {
          if (attempt === 0 && isTransientSupabaseError(refreshError)) {
            continue
          }
          throw refreshError
        }

        if (refreshedData?.session) {
          return refreshedData.session
        }
      }

      throw new Error('Nao foi possivel renovar a sessao atual.')
    })().finally(() => {
      refreshSessionPromise = null
    })
  }

  return refreshSessionPromise
}
