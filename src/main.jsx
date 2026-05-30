import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.jsx'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN, // set VITE_SENTRY_DSN in Netlify env vars
  enabled: !!import.meta.env.VITE_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: import.meta.env.MODE,
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
