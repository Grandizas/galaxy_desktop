import { createHashRouter } from 'react-router-dom'

import { ROUTES } from '@/lib/constants'

import { AppShell } from './AppShell'
import { AboutPage } from './routes/AboutPage'
import { DebugPage } from './routes/DebugPage'
import { GalaxyPage } from './routes/GalaxyPage'
import { NotFoundPage } from './routes/NotFoundPage'
import { RouteErrorPage } from './routes/RouteErrorPage'
import { SettingsPage } from './routes/SettingsPage'

/**
 * Hash routing: a packaged Tauri app is served from a file-like origin, where
 * browser-history routes 404 on reload.
 */
export const router = createHashRouter([
  {
    path: ROUTES.galaxy,
    element: <AppShell />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <GalaxyPage /> },
      { path: ROUTES.settings.slice(1), element: <SettingsPage /> },
      { path: ROUTES.about.slice(1), element: <AboutPage /> },
      { path: ROUTES.debug.slice(1), element: <DebugPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
