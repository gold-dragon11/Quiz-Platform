import { DecorCurves } from '@/features/landing/components/DecorCurves';
import { Skeleton } from '@/shared/ui/Skeleton';
import { CatalogueSpread } from '@/features/landing/components/CatalogueSpread';
import { useCatalogue } from '@/features/landing/hooks/use-catalogue';
import { SectionHeading } from '@/features/landing/components/SectionHeading';
import { SECTION_CONTAINER, SECTION_SPACING } from '@/features/landing/constants';

/**
 * The scale of the bank — read, not counted.
 *
 * This section used to be four numbers in four equal cells, written by hand
 * because no public endpoint existed. Two of those numbers were the same fact:
 * 76 topics and 76 materials, because every topic has exactly one. The tiles
 * hid that for months — nobody reads a tile, they look at it.
 *
 * The numbers now come from `GET /catalogue`, which was opened for exactly
 * this. Four hand-kept numbers were a defensible thing to write down; seventy-
 * six hand-kept topic names would drift from the bank in silence.
 */
export function StatsSection(): React.JSX.Element | null {
  const catalogue = useCatalogue();

  // The whole section goes, heading included. Hiding only the body left the
  // heading standing over nothing — a page that looks broken rather than one
  // that quietly has less to say.
  if (catalogue.isError) {
    return null;
  }

  return (
    <section className="relative overflow-hidden">
      <DecorCurves set="b" />

      <div className={`${SECTION_CONTAINER} ${SECTION_SPACING} relative`}>
        <SectionHeading title="Підготовка, зібрана в одному місці" />

        {catalogue.isPending ? (
          <div className="mx-auto flex max-w-5xl flex-col gap-10">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-28" />
            ))}
          </div>
        ) : (
          <CatalogueSpread catalogue={catalogue.data} />
        )}
      </div>
    </section>
  );
}
