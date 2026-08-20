import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../services/api'

export interface AsyncResource<T> {
  data: T | null
  loading: boolean
  error: string | null
  reload: () => void
}

export function describeApiError(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Something went wrong talking to the server.'
}

/**
 * Runs an async loader and tracks its loading/error state.
 *
 * `loader` must be referentially stable across renders — wrap it in useMemo
 * keyed on whatever it closes over (usually businessId). Pass null when there
 * is nothing to load (demo mode has no server-side business), and the hook
 * settles into an idle, non-loading state instead of fetching.
 */
export function useApiResource<T>(loader: (() => Promise<T>) | null): AsyncResource<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(loader !== null)
  const [error, setError] = useState<string | null>(null)
  const [token, setToken] = useState(0)

  useEffect(() => {
    if (!loader) {
      setData(null)
      setLoading(false)
      setError(null)
      return
    }

    // Guards against a slow earlier request landing after a newer one and
    // overwriting fresher data, or resolving onto an unmounted component.
    let cancelled = false
    setLoading(true)
    setError(null)

    loader()
      .then((result) => {
        if (cancelled) return
        setData(result)
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        console.error(err)
        setError(describeApiError(err))
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [loader, token])

  const reload = useCallback(() => setToken((n) => n + 1), [])

  return { data, loading, error, reload }
}
