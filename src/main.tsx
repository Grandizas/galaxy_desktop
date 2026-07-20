import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from '@/app/App'
import '@/styles/globals.css'

const container = document.getElementById('root')
if (!container) throw new Error('Root element #root is missing from index.html')

// The desktop shell draws its own chrome — suppress the WebView context menu.
document.addEventListener('contextmenu', (event) => event.preventDefault())

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
