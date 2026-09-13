/**
 * Keeping the questions of one text together (docs/02-domain/passage.md).
 *
 * A passage is read once and then asked about several times — five questions
 * on one story, five gaps in one paragraph. Drawn independently, those
 * questions would arrive scattered through a session and out of order, and
 * the reader would be sent back to the same text five times from five
 * different places. Both helpers here work on ids alone, so every way a
 * session is assembled — random practice, a mock sitting, a duel, homework,
 * mistake review — can share them.
 */

/** One question as far as grouping is concerned. */
export interface PassageMember {
  id: string;
  passageId: string | null;
  passageOrder: number | null;
}

/**
 * Takes `count` questions from `candidates`, which arrive already in
 * preference order (never seen first, then random), without splitting a text.
 *
 * A passage enters the draw as one unit, at the position of its most
 * preferred question, carrying all of its candidates in their own order. Units
 * are taken whole while they fit. Once none does, the next one is cut to the
 * remainder: questions 1–3 of a five-question text still read as a task,
 * while refusing to fill the session would turn "12 questions" into a 409 on
 * a topic made entirely of five-question texts.
 */
export function drawKeepingPassages(
  candidates: PassageMember[],
  count: number,
): string[] {
  const units = unitsInOrder(candidates);
  const taken = new Set<PassageMember[]>();
  const ids: string[] = [];

  for (const unit of units) {
    if (ids.length === count) {
      break;
    }
    if (unit.length <= count - ids.length) {
      ids.push(...unit.map((member) => member.id));
      taken.add(unit);
    }
  }

  // Every unit still untaken was skipped because it was longer than the
  // remainder was at that moment, and the remainder has only shrunk since —
  // so the first of them is cut rather than searched for one that fits.
  if (ids.length < count) {
    const cut = units.find((unit) => !taken.has(unit));
    if (cut) {
      ids.push(...cut.slice(0, count - ids.length).map((member) => member.id));
    }
  }

  return ids;
}

/**
 * Reorders a finished list so each passage's questions sit next to each other,
 * in their own order, where the first of them already stood. Questions without
 * a passage do not move relative to each other.
 *
 * This runs when a session is created, whatever assembled the list: a teacher
 * picking questions by hand or the mistake-review schedule has no reason to
 * know about passages, and should not have to.
 */
export function clusterByPassage(members: PassageMember[]): string[] {
  return unitsInOrder(members).flatMap((unit) =>
    unit.map((member) => member.id),
  );
}

/**
 * Groups members into units in order of first appearance: a lone question is a
 * unit of one, a passage is a unit of every member that belongs to it, sorted
 * by its position in the text.
 */
function unitsInOrder(members: PassageMember[]): PassageMember[][] {
  const units: PassageMember[][] = [];
  const byPassage = new Map<string, PassageMember[]>();

  for (const member of members) {
    if (member.passageId === null) {
      units.push([member]);
      continue;
    }
    const unit = byPassage.get(member.passageId);
    if (unit) {
      unit.push(member);
    } else {
      const created = [member];
      byPassage.set(member.passageId, created);
      units.push(created);
    }
  }

  for (const unit of byPassage.values()) {
    // A stable sort keeps members without an order where they arrived.
    unit.sort(
      (a, b) =>
        (a.passageOrder ?? Number.MAX_SAFE_INTEGER) -
        (b.passageOrder ?? Number.MAX_SAFE_INTEGER),
    );
  }

  return units;
}
