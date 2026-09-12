import type { NmtTask } from './nmt-paper.types';

/**
 * How the paper numbers its tasks (docs/02-domain/nmt-paper.md §3).
 *
 * Almost everywhere a task is a number: task 7 fills row 7 of the answer
 * sheet. English breaks that — one matching task fills five or six rows, and
 * the paper prints it as «(1–5)» — so the number on a task is where its run
 * begins and `covers` says how far it reaches.
 */

/** Rows of the answer sheet this task fills; one unless the paper says more. */
export function taskCovers(task: NmtTask): number {
  return task.covers ?? 1;
}

/** The last number of the task's run: the same number for an ordinary task. */
export function taskEnd(task: NmtTask): number {
  return task.number + taskCovers(task) - 1;
}

/** What the paper prints above the task — «7», or «1–5» over a run. */
export function taskLabel(task: NmtTask): string {
  const end = taskEnd(task);
  return end === task.number ? `${task.number}` : `${task.number}–${end}`;
}
