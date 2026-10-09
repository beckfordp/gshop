import { useState } from 'react'
import Catalog from './screens/Catalog/Catalog'
import Cart from './screens/Cart/Cart'
import Checkout from './screens/Checkout/Checkout'
import OrderHistory from './screens/OrderHistory/OrderHistory'
import type { Order } from './services/orderClient'
import './App.css'

type Screen = 'catalog' | 'cart' | 'checkout' | 'history'

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
      <nav>
        {screen === 'catalog' && (
          <>
            <button onClick={() => setScreen('cart')}>View Cart</button>
            <button onClick={() => setScreen('history')}>Order History</button>
          </>
        )}
        {screen === 'cart' && (
          <>
            <button onClick={() => setScreen('catalog')}>Back to Catalog</button>
            <button onClick={() => setScreen('history')}>Order History</button>
          </>
        )}
        {screen === 'history' && (
          <>
            <button onClick={() => setScreen('catalog')}>Back to Catalog</button>
            <button onClick={() => setScreen('cart')}>View Cart</button>
          </>
        )}
      </nav>
      {screen === 'catalog' && <Catalog />}
      {screen === 'cart' && <Cart onCheckoutSuccess={handleCheckoutSuccess} />}
      {screen === 'checkout' && lastOrder && (
        <Checkout order={lastOrder} onContinueShopping={handleContinueShopping} />
      )}
      {screen === 'history' && <OrderHistory />}
    </>
  )
}

export default App
