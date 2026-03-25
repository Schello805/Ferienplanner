import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { RootApp } from './RootApp.jsx'
import { AppErrorBoundary } from './components/AppErrorBoundary.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppErrorBoundary>
      <RootApp />
    </AppErrorBoundary>
  </StrictMode>,
)
