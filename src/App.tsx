import { useState } from 'react'
import Catalog from './screens/Catalog/Catalog'
import Cart from './screens/Cart/Cart'
import './App.css'

type Screen = 'catalog' | 'cart'

function App() {
  const [screen, setScreen] = useState<Screen>('catalog')

  return (
    <>
      <nav>
        {screen === 'catalog' ? (
          <button onClick={() => setScreen('cart')}>View Cart</button>
        ) : (
          <button onClick={() => setScreen('catalog')}>Back to Catalog</button>
        )}
      </nav>
      {screen === 'catalog' ? (
        <Catalog />
      ) : (
        // TODO(checkout_20261009 Phase 4): wire a real onCheckoutSuccess
        // that switches to the Checkout screen with the created order.
        <Cart onCheckoutSuccess={() => {}} />
      )}
    </>
  )
}

export default App
