import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'

import { ROUTES } from '@/lib/constants'

import { RouteOverlay } from './RouteOverlay'

/**
 * Router `errorElement`. It catches genuine 404s *and* render crashes, so it
 * must distinguish them — showing "not found" for a thrown exception hides
 * the real problem.
 */
export function RouteErrorPage() {
  const error = useRouteError()

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <RouteOverlay title="Lost in space" subtitle="That route is not charted.">
        <Link to={ROUTES.galaxy} className="text-primary-soft hover:text-accent">
          Return to the galaxy
        </Link>
      </RouteOverlay>
    )
  }

  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined

  return (
    <RouteOverlay title="The galaxy collapsed" subtitle="An unhandled error reached the router.">
      <p className="font-mono text-[11px] wrap-anywhere text-danger">{message}</p>
      {stack && (
        <pre className="mt-4 max-h-56 overflow-auto rounded-lg bg-black/40 p-3 font-mono text-[10px] leading-relaxed text-content-muted">
          {stack}
        </pre>
      )}
      <Link to={ROUTES.galaxy} className="mt-5 inline-block text-primary-soft hover:text-accent">
        Return to the galaxy
      </Link>
    </RouteOverlay>
  )
}
