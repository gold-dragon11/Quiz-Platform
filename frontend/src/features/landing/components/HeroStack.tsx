import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { IsoTile } from '@/features/landing/components/scene/IsoTile';
import {
  EnglishSheet,
  HistorySheet,
  MathSheet,
  UkrainianSheet,
} from '@/features/landing/components/scene/sheets';
import { clamp, lerp } from '@/features/landing/lib/scene-math';

/** Heights of the four slots in the stack, bottom to top. */
const SLOTS = [0, 46, 92, 158];
const SHUFFLE_EVERY_MS = 2300;
const SHUFFLE_MOVE = 'transform 0.6s cubic-bezier(0.65, 0, 0.35, 1)';

/**
 * The hero's drawing: four sheets, one per subject, with a task of the real
 * exam on each.
 *
 * It moves by what the reader holds. With a mouse the stack leans a little
 * towards the pointer. On a touch screen there is no pointer to follow, so the
 * stack shuffles: the top sheet slides away, the rest rise a level and the next
 * subject comes in underneath — and only while it is on screen. With reduced
 * motion it stands still.
 */
export function HeroStack(): React.JSX.Element {
  const sceneRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const tileRefs = useRef<(HTMLDivElement | null)[]>([]);
  const reduced = useReducedMotion() ?? false;

  // Lean towards the pointer.
  useEffect(() => {
    const scene = sceneRef.current;
    const world = worldRef.current;
    const hero = scene?.closest('section');
    if (reduced || !scene || !world || !hero || !window.matchMedia('(pointer: fine)').matches) return;

    let target = { x: 0, y: 0 };
    let current = { x: 0, y: 0 };
    let raf = 0;

    const loop = (): void => {
      current = { x: lerp(current.x, target.x, 0.08), y: lerp(current.y, target.y, 0.08) };
      world.style.setProperty('--rx', `${(56 - current.y * 7).toFixed(2)}deg`);
      world.style.setProperty('--rz', `${(45 + current.x * 9).toFixed(2)}deg`);
      const moving = Math.abs(current.x - target.x) + Math.abs(current.y - target.y) > 0.001;
      raf = moving ? requestAnimationFrame(loop) : 0;
    };
    const onMove = (event: PointerEvent): void => {
      const box = scene.getBoundingClientRect();
      target = {
        x: clamp((event.clientX - (box.left + box.width / 2)) / box.width, -0.6, 0.6),
        y: clamp((event.clientY - (box.top + box.height / 2)) / box.height, -0.6, 0.6),
      };
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const onLeave = (): void => {
      target = { x: 0, y: 0 };
      if (!raf) raf = requestAnimationFrame(loop);
    };

    hero.addEventListener('pointermove', onMove);
    hero.addEventListener('pointerleave', onLeave);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      hero.removeEventListener('pointermove', onMove);
      hero.removeEventListener('pointerleave', onLeave);
    };
  }, [reduced]);

  // Shuffle on a touch screen.
  useEffect(() => {
    const scene = sceneRef.current;
    const tiles = tileRefs.current.filter((tile): tile is HTMLDivElement => tile !== null);
    if (
      reduced ||
      !scene ||
      tiles.length !== SLOTS.length ||
      window.matchMedia('(pointer: fine)').matches ||
      typeof IntersectionObserver === 'undefined'
    ) {
      return;
    }

    let order = [...tiles];
    let timer = 0;
    const timeouts = new Set<number>();
    const place = (tile: HTMLElement, x: number, z: number): void => {
      tile.style.setProperty('--x', `${x}px`);
      tile.style.setProperty('--z', `${z}px`);
    };

    for (const tile of tiles) {
      tile.removeAttribute('data-float');
      tile.style.transition = SHUFFLE_MOVE;
    }

    const shuffle = (): void => {
      const top = order[3];
      top.removeAttribute('data-active');
      place(top, 760, 230);
      for (let slot = 0; slot < 3; slot++) place(order[slot], 0, SLOTS[slot + 1]);
      order[2].setAttribute('data-active', '');

      const id = window.setTimeout(() => {
        timeouts.delete(id);
        // Round the back: from the far side straight into the bottom slot.
        top.style.transition = 'none';
        place(top, -760, -40);
        void top.getBoundingClientRect();
        top.style.transition = SHUFFLE_MOVE;
        place(top, 0, SLOTS[0]);
        order = [top, order[0], order[1], order[2]];
      }, 630);
      timeouts.add(id);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !timer) {
          timer = window.setInterval(shuffle, SHUFFLE_EVERY_MS);
        } else if (!entry.isIntersecting && timer) {
          window.clearInterval(timer);
          timer = 0;
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(scene);

    return () => {
      observer.disconnect();
      window.clearInterval(timer);
      timeouts.forEach((id) => window.clearTimeout(id));
    };
  }, [reduced]);

  const sheets = [
    { spine: 'Англійська мова', dot: 'var(--lp-blue)', content: <EnglishSheet /> },
    { spine: 'Українська мова', dot: 'var(--color-warning)', content: <UkrainianSheet /> },
    { spine: 'Математика', dot: 'var(--color-success)', content: <MathSheet /> },
    { spine: 'Історія України', dot: 'var(--color-primary-hover)', content: <HistorySheet /> },
  ];

  return (
    <div
      ref={sceneRef}
      className="lp-scene lp-hero-scene"
      role="img"
      aria-label="Стос аркушів НМТ: історія, математика, українська й англійська, на кожному — завдання у форматі іспиту"
    >
      <div className="lp-lamp" />
      <div className="lp-floor" />
      <div ref={worldRef} className="lp-world">
        {sheets.map((sheet, index) => {
          const top = index === sheets.length - 1;
          return (
            <IsoTile
              key={sheet.spine}
              ref={(element) => {
                tileRefs.current[index] = element;
              }}
              spine={sheet.spine}
              dot={sheet.dot}
              active={top}
              vars={{ '--z': `${SLOTS[index]}px` }}
              data={{ 'data-float': top ? '' : undefined }}
            >
              {sheet.content}
            </IsoTile>
          );
        })}
      </div>
    </div>
  );
}
