const TRANSIENT_ERROR_PATTERNS = ['tempo limite', 'failed to fetch', 'network', 'connection', 'abort']

export function isTransientRequestError(error) {
  const message = String(error?.message ?? '').toLowerCase()
  return TRANSIENT_ERROR_PATTERNS.some((pattern) => message.includes(pattern))
}

function wait(delayMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs)
  })
}

export async function withRequestTimeout(promise, { timeoutMs = 22000, message } = {}) {
  const timeoutMessage = message ?? 'Tempo limite ao carregar os dados. Tente novamente.'
  let timeoutId = null

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }
  }
}

export async function runWithRetries(
  task,
  {
    attempts = 2,
    retryDelayMs = 350,
    shouldRetry = isTransientRequestError,
  } = {},
) {
  let lastError = null

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await task()
    } catch (error) {
      lastError = error

      const canRetry = attempt < attempts && shouldRetry(error)
      if (!canRetry) {
        throw error
      }

      await wait(retryDelayMs * attempt)
    }
  }

  throw lastError ?? new Error('Falha ao carregar dados do Supabase.')
}
