/**
 * Page header for the browser (Phase 6.7 §1). Large title plus a subtitle
 * explaining the learning flow: pick a subject, choose a topic, start a quiz.
 * Entrance animation is applied by the page's stagger container.
 */
export function SubjectsHero(): React.JSX.Element {
  return (
    <header className="flex flex-col gap-2">
      <h1 className="text-text-primary text-3xl font-semibold">Subjects</h1>
      <p className="text-text-muted max-w-2xl">
        Browse everything there is to learn. Pick a subject to see its topics, then start a quiz on the whole
        subject or a single topic.
      </p>
    </header>
  );
}
