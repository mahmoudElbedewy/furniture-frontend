import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import { CartProvider } from './contexts/CartContext.tsx'
import StorefrontRoutes from './routes/StorefrontRoutes.tsx'

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <HelmetProvider>
      <CartProvider>
        <StorefrontRoutes />
      </CartProvider>
    </HelmetProvider>
  </BrowserRouter>,
)
