import { Button } from '@/shared/ui/Button';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/** Minimal prev/next pagination for admin lists. Hidden for a single page. */
export function Pagination({ page, totalPages, onPageChange }: PaginationProps): React.JSX.Element | null {
  if (totalPages <= 1) {
    return null;
  }
  return (
    <div className="flex items-center justify-between gap-4 pt-2">
      <span className="text-text-muted text-sm">
        Page {page} of {totalPages}
      </span>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
