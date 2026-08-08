export type AdminTabId = 'subjects' | 'topics' | 'questions' | 'quizzes';

interface AdminTabsProps {
  active: AdminTabId;
  onChange: (tab: AdminTabId) => void;
}

const TABS: { id: AdminTabId; label: string }[] = [
  { id: 'subjects', label: 'Предмети' },
  { id: 'topics', label: 'Теми' },
  { id: 'questions', label: 'Питання' },
  { id: 'quizzes', label: 'Тести' },
];

/** In-page tab navigation for the admin panel (no route changes — local state). */
export function AdminTabs({ active, onChange }: AdminTabsProps): React.JSX.Element {
  return (
    <div
      role="tablist"
      aria-label="Розділи адміністрування"
      className="border-border flex gap-1 overflow-x-auto border-b"
    >
      {TABS.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={`-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary ${
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
