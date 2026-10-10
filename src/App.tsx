import { useState } from 'react'
import Catalog from './screens/Catalog/Catalog'
import Cart from './screens/Cart/Cart'
import Checkout from './screens/Checkout/Checkout'
import OrderHistory from './screens/OrderHistory/OrderHistory'
import type { Order } from './services/orderClient'
import './App.css'

type Screen = 'catalog' | 'cart' | 'checkout' | 'history'

const NAV_TARGETS: { screen: Exclude<Screen, 'checkout'>; label: string }[] = [
  { screen: 'catalog', label: 'Back to Catalog' },
  { screen: 'cart', label: 'View Cart' },
  { screen: 'history', label: 'Order History' },
]

function App() {
  const [screen, setScreen] = useState<Screen>('catalog')
  const [lastOrder, setLastOrder] = useState<Order | null>(null)

  const handleCheckoutSuccess = (order: Order) => {
    setLastOrder(order)
    setScreen('checkout')
  }

  const handleContinueShopping = () => {
    setLastOrder(null)
    setScreen('catalog')
  }

  return (
    <>
      <header className="app-header">
        <span className="app-header__wordmark">gshop</span>
        <nav className="app-nav">
          {screen !== 'checkout' &&
            NAV_TARGETS.filter((target) => target.screen !== screen).map((target) => (
              <button
                key={target.screen}
                className="nav-link"
                onClick={() => setScreen(target.screen)}
              >
                {target.label}
              </button>
            ))}
        </nav>
      </header>
      <main className="app-main">
        {screen === 'catalog' && <Catalog />}
        {screen === 'cart' && <Cart onCheckoutSuccess={handleCheckoutSuccess} />}
        {screen === 'checkout' && lastOrder && (
          <Checkout order={lastOrder} onContinueShopping={handleContinueShopping} />
        )}
        {screen === 'history' && <OrderHistory />}
      </main>
    </>
  )
}

export default App
