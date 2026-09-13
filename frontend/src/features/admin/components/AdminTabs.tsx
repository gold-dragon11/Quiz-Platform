import { ADMIN_TABS, type AdminTabId } from '@/features/admin/components/admin-tabs';

interface AdminTabsProps {
  active: AdminTabId;
  onChange: (tab: AdminTabId) => void;
}

/**
 * Section navigation for the admin panel. The open section is a query
 * parameter, not local state — see AdminPanelPage.
 *
 * Set in the letterspaced small caps the rest of the interface uses for
 * section labels, so the panel reads as part of the same product rather than
 * as a settings screen borrowed from somewhere else.
 */
export function AdminTabs({ active, onChange }: AdminTabsProps): React.JSX.Element {
  return (
    <div
      role="tablist"
      aria-label="Розділи адміністрування"
      className="border-border flex gap-1 overflow-x-auto border-b"
    >
      {ADMIN_TABS.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={`-mb-px shrink-0 border-b-2 px-4 py-3 text-xs tracking-[0.18em] uppercase outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary ${
              selected
                ? 'border-primary text-text-primary'
                : 'text-text-muted hover:text-text-secondary border-transparent'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
