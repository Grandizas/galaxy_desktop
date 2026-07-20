import { RouterProvider } from 'react-router-dom'

import { ErrorBoundary } from './ErrorBoundary'
import { router } from './router'

/** Composition root: providers wrap the router, the router owns the shell. */
export function App() {
  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  )
}
