/** A candidate question for a passage block, as the draw reads it. */
export interface PassageBlockCandidate {
  id: string;
  passageId: string;
  passageOrder: number | null;
  nmtTask: number;
  /** When this learner last saw the question; null if never. */
  lastSeen: Date | null;
}

/**
 * Picks the text for a run of tasks asked about one passage
 * (docs/02-domain/nmt-paper.md §5) and returns its question for every number,
 * in the paper's order — or null when no passage covers them all.
 *
 * Candidates arrive in random order; that order breaks every tie. Among the
 * passages that cover the run, the one this learner met longest ago wins, and
 * one never met beats any that was: a text is seen as a whole, so it counts as
 * seen from the last time any of its questions was. If a passage has two
 * questions for one number, the earlier in the text is taken.
 */
export function pickPassageBlock(
  candidates: PassageBlockCandidate[],
  numbers: number[],
): string[] | null {
  const passages = new Map<string, PassageBlockCandidate[]>();
  for (const candidate of candidates) {
    const members = passages.get(candidate.passageId) ?? [];
    members.push(candidate);
    passages.set(candidate.passageId, members);
  }

  let best: { ids: string[]; lastSeen: number } | null = null;
  for (const members of passages.values()) {
    const ids: string[] = [];
    for (const number of numbers) {
      const forNumber = members
        .filter((member) => member.nmtTask === number)
        .sort(
          (a, b) =>
            (a.passageOrder ?? Number.MAX_SAFE_INTEGER) -
            (b.passageOrder ?? Number.MAX_SAFE_INTEGER),
        );
      if (forNumber.length === 0) {
        break;
      }
      ids.push(forNumber[0].id);
    }
    if (ids.length < numbers.length) {
      continue;
    }
    const lastSeen = Math.max(
      -1,
      ...members.map((member) => member.lastSeen?.getTime() ?? -1),
    );
    if (best === null || lastSeen < best.lastSeen) {
      best = { ids, lastSeen };
    }
  }
  return best?.ids ?? null;
}
