import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import AdminOrders from './components/AdminOrders.tsx';

const isAdminPage = window.location.pathname === '/admin';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isAdminPage ? <AdminOrders /> : <App />}
  </StrictMode>,
)
