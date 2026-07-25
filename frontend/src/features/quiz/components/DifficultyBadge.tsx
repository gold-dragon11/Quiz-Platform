import { Difficulty } from '@/shared/types/enums';
import { Badge, type BadgeTone } from '@/shared/ui/Badge';

const TONE: Record<Difficulty, BadgeTone> = {
  [Difficulty.BEGINNER]: 'success',
  [Difficulty.INTERMEDIATE]: 'warning',
  [Difficulty.ADVANCED]: 'error',
};

const LABEL: Record<Difficulty, string> = {
  [Difficulty.BEGINNER]: 'Beginner',
  [Difficulty.INTERMEDIATE]: 'Intermediate',
  [Difficulty.ADVANCED]: 'Advanced',
};

/** Small difficulty pill; renders nothing when the question has no difficulty. */
export function DifficultyBadge({ difficulty }: { difficulty: Difficulty | null }): React.JSX.Element | null {
  if (!difficulty) {
    return null;
  }
  return <Badge tone={TONE[difficulty]}>{LABEL[difficulty]}</Badge>;
}
