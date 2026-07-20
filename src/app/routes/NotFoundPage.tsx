import { Link } from 'react-router-dom'

import { ROUTES } from '@/lib/constants'

import { RouteOverlay } from './RouteOverlay'

export function NotFoundPage() {
  return (
    <RouteOverlay title="Lost in space" subtitle="That route is not charted.">
      <Link to={ROUTES.galaxy} className="text-primary-soft hover:text-accent">
        Return to the galaxy
      </Link>
    </RouteOverlay>
  )
}
