import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { formatNumber, pluralUk } from '@/shared/utils/format';
import { useMistakeReviewSummary } from '@/features/mistake-review/hooks/use-mistake-review';

/**
 * "You have mistakes due today" — or nothing at all.
 *
 * Spaced repetition only works if something reminds you, and the review page
 * cannot remind anyone: it is only seen by people who already remembered. So
 * the prompt lives on the dashboard, where the day starts.
 *
 * Renders `null` — not an empty wrapper — when there is nothing due, because
 * the dashboard lays its sections out with a flex gap: a component that
 * returns an empty element would leave a phantom space behind.
 */
export function MistakeReviewPrompt(): React.JSX.Element | null {
  const navigate = useNavigate();
  const summary = useMistakeReviewSummary();

  const due = summary.data?.due ?? 0;
  if (due === 0) {
    return null;
  }

  return (
    <Card className="border-warning/40 bg-warning/5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-text-primary font-medium">
          На сьогодні {formatNumber(due)}{' '}
          {pluralUk(due, 'помилка до повторення', 'помилки до повторення', 'помилок до повторення')}
        </p>
        <p className="text-text-muted text-sm">
          Коротка сесія — і вони повернуться нескоро, а частина не повернеться взагалі.
        </p>
      </div>
      <Button variant="secondary" onClick={() => navigate(ROUTES.mistakeReview)}>
        Повторити
      </Button>
    </Card>
  );
}
