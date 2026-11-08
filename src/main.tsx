import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import AdminOrders from './components/AdminOrders.tsx';
import ChefOrders from './components/ChefOrders.tsx';

const path =
  window.location.pathname.replace(/\/+$/, '') || '/';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {path === '/admin/order' || path === '/admin' || path === '/admin/finance' || path === '/admin/account' ? (
      <AdminOrders initialFinance={path === '/admin/finance'} />
    ) : path === '/chef' ? (
      <ChefOrders />
    ) : (
      <App />
    )}
  </StrictMode>,
);
