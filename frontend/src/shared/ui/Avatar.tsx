import { useState } from 'react';

export type AvatarSize = 'sm' | 'md' | 'lg';

interface AvatarProps {
  imageUrl?: string;
  alt?: string;
  /** Character shown when there is no image (e.g. a name initial). */
  fallback?: string;
  size?: AvatarSize;
  className?: string;
}

const SIZE_CLASS: Record<AvatarSize, string> = {
  sm: 'size-10 text-base',
  md: 'size-14 text-lg',
  lg: 'size-16 text-xl',
};

/**
 * Reusable avatar (docs/07-design/components.md §11) with a graceful fallback
 * to a neutral initial when no image is available or the image fails to load.
 */
export function Avatar({
  imageUrl,
  alt = 'Avatar',
  fallback = '?',
  size = 'md',
  className = '',
}: AvatarProps): React.JSX.Element {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(imageUrl) && !failed;

  return (
    <div
      className={`bg-surface-elevated border-border flex shrink-0 items-center justify-center overflow-hidden rounded-full border ${SIZE_CLASS[size]} ${className}`}
    >
      {showImage ? (
        <img src={imageUrl} alt={alt} className="size-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <span className="text-text-secondary font-semibold uppercase">{fallback}</span>
      )}
    </div>
  );
}
