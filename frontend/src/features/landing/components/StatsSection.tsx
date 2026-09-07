import { DecorCurves } from '@/features/landing/components/DecorCurves';
import { CatalogueSpread } from '@/features/landing/components/CatalogueSpread';
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
export function StatsSection(): React.JSX.Element {
  return (
    <section className="relative overflow-hidden">
      <DecorCurves set="b" />

      <div className={`${SECTION_CONTAINER} ${SECTION_SPACING} relative`}>
        <SectionHeading title="Підготовка, зібрана в одному місці" />

        <CatalogueSpread />
      </div>
    </section>
  );
}
