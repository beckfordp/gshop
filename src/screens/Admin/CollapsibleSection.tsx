// SPDX-License-Identifier: MIT

import { useId, useState, type ReactNode } from 'react';

interface CollapsibleSectionProps {
  title: string;
  note?: ReactNode;
  /** Header buttons shown only while the section is open (e.g. Refresh). */
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** An Admin section that starts collapsed behind a Show/Hide toggle. */
export default function CollapsibleSection({
  title,
  note,
  actions,
  className = 'admin-section',
  children,
}: CollapsibleSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const headingId = useId();
  const name = title.toLowerCase();

  return (
    <section className={className} aria-labelledby={headingId}>
      <div className="admin-section__header">
        <div>
          <h2 id={headingId}>{title}</h2>
          {note && <p className="admin-section__note">{note}</p>}
        </div>
        <div className="admin-section__actions">
          {expanded && actions}
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((open) => !open)}
          >
            {expanded ? `Hide ${name}` : `Show ${name}`}
          </button>
        </div>
      </div>
      {expanded && children}
    </section>
  );
}
