import { ProgressBar } from '@/shared/ui/ProgressBar';

interface QuizProgressProps {
  index: number;
  total: number;
  answeredCount: number;
}

/**
 * Session progress: the current question position and how many questions have
 * been answered so far, with an animated bar (docs/01-prd/dashboard.md motion
 * language reused).
 */
export function QuizProgress({ index, total, answeredCount }: QuizProgressProps): React.JSX.Element {
  const percent = total > 0 ? (answeredCount / total) * 100 : 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-text-primary font-medium">
          Питання {index + 1} з {total}
        </span>
        <span className="text-text-muted">
          Відповіли на {answeredCount} з {total}
        </span>
      </div>
      <ProgressBar value={percent} label="Прогрес тесту" />
    </div>
  );
}
