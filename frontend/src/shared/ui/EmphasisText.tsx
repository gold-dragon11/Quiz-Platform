/** `**виділене**` — the words a task points at. */
const EMPHASIS = /\*\*(.+?)\*\*/g;

/**
 * Plain text with the fragments a task refers to set in bold italic, as the
 * paper prints them: «Роль підмета виконує виділене в тексті слово», «з’ясуйте,
 * якою частиною мови є виділені слова».
 *
 * The marking is two asterisks either side, never HTML: content arrives from
 * the seed and the Admin API as text, and stays text.
 */
export function EmphasisText({ children }: { children: string }): React.JSX.Element {
  if (!children.includes('**')) {
    return <>{children}</>;
  }
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const match of children.matchAll(EMPHASIS)) {
    const start = match.index ?? 0;
    parts.push(children.slice(last, start));
    parts.push(
      <em key={start} className="text-text-primary font-semibold">
        {match[1]}
      </em>,
    );
    last = start + match[0].length;
  }
  parts.push(children.slice(last));
  return <>{parts}</>;
}
