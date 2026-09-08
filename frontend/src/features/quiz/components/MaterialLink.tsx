import { generatePath, Link } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { useTopicMaterial } from '@/features/learning-materials';

interface MaterialLinkProps {
  topicId: string;
}

/**
 * Offers the learning material for the topic just tested.
 *
 * This is the moment it is most useful — the reader has just seen which
 * questions they missed. Renders nothing at all while loading or when the
 * topic has no material (a 404, which most topics still answer), so the result
 * page never shows a placeholder for content that does not exist.
 */
export function MaterialLink({ topicId }: MaterialLinkProps): React.JSX.Element | null {
  const material = useTopicMaterial(topicId);

  if (!material.data) {
    return null;
  }

  return (
    <section className="border-border border-t pt-8">
      <h2 className="text-text-muted text-xs tracking-[0.18em] uppercase">Повторити теорію</h2>
      <p className="text-text-primary mt-4">{material.data.title}</p>
      <Link
        to={generatePath(ROUTES.topicMaterial, { topicId })}
        className="text-primary mt-4 inline-block text-sm underline underline-offset-4"
      >
        Читати конспект
      </Link>
    </section>
  );
}
