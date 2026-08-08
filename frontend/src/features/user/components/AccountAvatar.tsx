import { useState } from 'react';

interface AccountAvatarProps {
  imageUrl?: string;
  alt?: string;
  /** Character shown when there is no image (e.g. the email initial). */
  fallback?: string;
  className?: string;
}

/**
 * Renders the user's avatar image with a graceful fallback: if no URL is
 * available or the image fails to load, a neutral initial is shown instead.
 */
export function AccountAvatar({
  imageUrl,
  alt = 'Ваш аватар',
  fallback = '?',
  className = '',
}: AccountAvatarProps): React.JSX.Element {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(imageUrl) && !failed;

  return (
    <div
      className={`bg-surface-elevated border-border flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border ${className}`}
    >
      {showImage ? (
        <img src={imageUrl} alt={alt} className="size-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <span className="text-text-secondary text-xl font-semibold uppercase">{fallback}</span>
      )}
    </div>
  );
}
