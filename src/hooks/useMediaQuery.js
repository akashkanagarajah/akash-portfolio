import { useCallback, useSyncExternalStore } from 'react'

/* Live `matchMedia` subscription — re-renders when the query flips (e.g. the OS
   reduced-motion toggle, or rotating a tablet between portrait and landscape). */
export function useMediaQuery(query) {
  const subscribe = useCallback(
    (onChange) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    [query]
  )
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  )
}

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
