interface PlaceholderPageProps {
  title: string;
}

/**
 * Temporary stand-in used by every route during the Phase 1 — Foundation
 * build. Real pages replace this one feature at a time; see
 * docs/08-development/roadmap.md for the phase order.
 */
export function PlaceholderPage({ title }: PlaceholderPageProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-text-muted">This page has not been implemented yet.</p>
    </div>
  );
}
