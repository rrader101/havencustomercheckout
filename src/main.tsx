import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { PostHogProvider } from 'posthog-js/react'

const options = {
  // In production, events go through our own domain (the /ingest rewrites in
  // vercel.json) — ad blockers and privacy browsers block us.i.posthog.com
  // outright, which is why a completed checkout can leave no analytics at all.
  // Local dev has no Vercel rewrites, so it talks to PostHog directly.
  api_host: import.meta.env.DEV ? import.meta.env.VITE_PUBLIC_POSTHOG_HOST : '/ingest',
  ui_host: 'https://us.posthog.com',
  defaults: '2025-05-24',
} as const

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
     <PostHogProvider apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY} options={options}>
        <App />
    </PostHogProvider>
  </React.StrictMode>,
)
