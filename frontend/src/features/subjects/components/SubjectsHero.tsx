/**
 * Page header for the browser (Phase 6.7 §1). Large title plus a subtitle
 * explaining the learning flow: pick a subject, choose a topic, start a quiz.
 * Entrance animation is applied by the page's stagger container.
 */
export function SubjectsHero(): React.JSX.Element {
  return (
    <header className="flex flex-col gap-2">
      <h1 className="text-text-primary text-3xl font-semibold">Предмети</h1>
      <p className="text-text-muted max-w-2xl">
        Перегляньте все, що можна вивчати. Оберіть предмет, щоб побачити його теми, а тоді почніть тест з
        усього предмета або з окремої теми.
      </p>
    </header>
  );
}
