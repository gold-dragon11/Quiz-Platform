import { Suspense, lazy } from 'react';
import { Skeleton } from '@/shared/ui/Skeleton';

const MarkdownContent = lazy(() =>
  import('@/features/learning-materials/components/MarkdownContent').then((module) => ({
    default: module.MarkdownContent,
  })),
);

interface MaterialBodyProps {
  content: string;
}

/**
 * Boundary around the Markdown renderer.
 *
 * The renderer pulls in react-markdown and KaTeX with its stylesheet — worth
 * several hundred kilobytes that only a reader who opens a material needs, so
 * it is split out of the main bundle and loaded on demand behind a skeleton.
 */
export function MaterialBody({ content }: MaterialBodyProps): React.JSX.Element {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className={i % 3 === 2 ? 'h-4 w-2/3' : 'h-4 w-full'} />
          ))}
        </div>
      }
    >
      <MarkdownContent content={content} />
    </Suspense>
  );
}
