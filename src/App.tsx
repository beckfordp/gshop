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
      {screen === 'catalog' ? <Catalog /> : <Cart />}
    </>
  )
}

export default App
