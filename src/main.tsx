import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { PostHogProvider } from 'posthog-js/react'

const options = {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  defaults: '2025-05-24',
  // Autocapture uncaught errors and unhandled promise rejections as $exception.
  // Without this the checkout is silent on client-side failure: a thrown error
  // reaches nothing but the browser console, so every investigation has to be
  // reconstructed from server access logs after the fact.
  //
  // Note this does NOT cover a crashed tab — when the browser kills the process
  // the event queue dies with it and nothing is ever sent. That gap is what
  // lib/crashReloadDetector.ts covers, by reporting on the next page load.
  capture_exceptions: true,
} as const

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
     <PostHogProvider apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY} options={options}>
        <App />
    </PostHogProvider>
  </React.StrictMode>,
)
