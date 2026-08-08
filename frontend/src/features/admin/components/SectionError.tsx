import { Button } from '@/shared/ui/Button';

interface SectionErrorProps {
  message?: string;
  onRetry: () => void;
}

/** Compact, isolated error state with retry for an admin section (F7). */
export function SectionError({
  message = 'Не вдалося завантажити ці дані.',
  onRetry,
}: SectionErrorProps): React.JSX.Element {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <p className="text-text-muted text-sm">{message}</p>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        Спробувати ще раз
      </Button>
    </div>
  );
}
