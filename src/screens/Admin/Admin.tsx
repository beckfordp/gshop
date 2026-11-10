// SPDX-License-Identifier: MIT

import AdminConsole from './AdminConsole';
import CatalogueAdmin from './CatalogueAdmin';
import CollapsibleSection from './CollapsibleSection';
import Fulfilment from '../Fulfilment/Fulfilment';
import './Admin.css';

export default function Admin() {
  return (
    <div className="admin">
      <h1>Admin</h1>

      <AdminConsole />

      <CollapsibleSection title="Fulfilment" note="Pick, pack and dispatch authorized orders.">
        <Fulfilment />
      </CollapsibleSection>

      <CollapsibleSection
        title="Catalogue"
        note="Products, prices and stock — add, edit, retire and adjust stock."
      >
        <CatalogueAdmin />
      </CollapsibleSection>
    </div>
  );
}
