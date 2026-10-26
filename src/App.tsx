import { useState } from 'react'
import Catalog from './screens/Catalog/Catalog'
import Cart from './screens/Cart/Cart'
import Checkout from './screens/Checkout/Checkout'
import OrderConfirmation from './screens/OrderConfirmation/OrderConfirmation'
import OrderHistory from './screens/OrderHistory/OrderHistory'
import Admin from './screens/Admin/Admin'
import type { NewOrderItem, Order } from './services/orderClient'
import './App.css'

type AppView =
  | { name: 'catalog' }
  | { name: 'cart' }
  | { name: 'checkout'; items: NewOrderItem[] }
  | { name: 'confirmation'; order: Order }
  | { name: 'history' }
  | { name: 'admin' }

const NAV_TARGETS: { view: AppView; label: string }[] = [
  { view: { name: 'catalog' }, label: 'Back to Catalog' },
  { view: { name: 'cart' }, label: 'View Cart' },
  { view: { name: 'history' }, label: 'Order History' },
]

function App() {
  const [view, setView] = useState<AppView>({ name: 'catalog' })
  const inCheckoutFlow = view.name === 'checkout' || view.name === 'confirmation'

  return (
    <>
      <header className="app-header">
        <span className="app-header__wordmark">gshop</span>
        <nav className="app-nav">
          {!inCheckoutFlow &&
            NAV_TARGETS.filter((target) => target.view.name !== view.name).map((target) => (
              <button
                key={target.view.name}
                className="nav-link"
                onClick={() => setView(target.view)}
              >
                {target.label}
              </button>
            ))}
        </nav>
      </header>
      <main className="app-main">
        {view.name === 'catalog' && <Catalog />}
        {view.name === 'cart' && (
          <Cart
            onProceedToCheckout={(items) => setView({ name: 'checkout', items })}
          />
        )}
        {view.name === 'checkout' && (
          <Checkout
            items={view.items}
            onOrderPlaced={(order) => setView({ name: 'confirmation', order })}
            onBackToCart={() => setView({ name: 'cart' })}
          />
        )}
        {view.name === 'confirmation' && (
          <OrderConfirmation
            order={view.order}
            onContinueShopping={() => setView({ name: 'catalog' })}
          />
        )}
        {view.name === 'history' && <OrderHistory />}
        {view.name === 'admin' && <Admin />}
      </main>
      {!inCheckoutFlow && (
        <a
          href="#"
          className="admin-entry"
          onClick={(event) => {
            event.preventDefault()
            setView({ name: 'admin' })
          }}
        >
          Admin
        </a>
      )}
    </>
  )
}

export default App
