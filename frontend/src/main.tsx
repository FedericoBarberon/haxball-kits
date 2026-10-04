import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './ui/styles/base.css'
import App from './App.tsx'
import { dependencies } from './composition'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App dependencies={dependencies} />
  </StrictMode>,
)
