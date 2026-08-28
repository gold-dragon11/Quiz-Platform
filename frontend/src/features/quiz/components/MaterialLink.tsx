import { generatePath, useNavigate } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { useTopicMaterial } from '@/features/learning-materials';

interface MaterialLinkProps {
  topicId: string;
}

/**
 * Offers the learning material for the topic just tested.
 *
 * This is the moment the material is most useful — the reader has just seen
 * which questions they missed. Renders nothing at all while loading or when
 * the topic has no material (a 404, which most topics still answer), so the
 * result page never shows a placeholder for content that does not exist.
 */
export function MaterialLink({ topicId }: MaterialLinkProps): React.JSX.Element | null {
  const navigate = useNavigate();
  const material = useTopicMaterial(topicId);

  if (!material.data) {
    return null;
  }

  const { title } = material.data;

  return (
    <Card>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-text-muted text-sm">Повторити теорію</p>
          <p className="text-text-primary mt-0.5 font-medium">{title}</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate(generatePath(ROUTES.topicMaterial, { topicId }))}
        >
          Читати матеріал
        </Button>
      </div>
    </Card>
  );
}
