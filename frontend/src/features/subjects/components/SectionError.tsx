import { Button } from '@/shared/ui/Button';

interface SectionErrorProps {
  message?: string;
  onRetry: () => void;
}

/**
 * Compact, self-contained error state for a single section, so one failed
 * request never breaks the page — other sections keep rendering (F7 error
 * handling, section isolation).
 */
export function SectionError({
  message = 'Не вдалося завантажити цей блок.',
  onRetry,
}: SectionErrorProps): React.JSX.Element {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
      <p className="text-text-muted text-sm">{message}</p>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        Спробувати ще раз
      </Button>
    </div>
  );
}
