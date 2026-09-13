import { Prisma, QuestionType } from '@prisma/client';
import {
  correctPairCount,
  countChosen,
  evaluateAnswer,
  readSequenceOrders,
  type EvaluableOption,
} from '../quiz-answer.util';
import type { NmtPaper, NmtTask } from './nmt-paper.types';
import { taskLabel } from './task-numbering';

/** What scoring needs to know about a question on the paper. */
export interface ScorableQuestion {
  id: string;
  type: QuestionType;
  nmtTask: number | null;
  configuration: Prisma.JsonValue;
  answerOptions: EvaluableOption[];
}

export interface NmtTaskScore {
  number: number;
  /** What the paper prints above the task — «7», or «1–5» over a run. */
  label: string;
  questionId: string;
  points: number;
  maxPoints: number;
}

export interface NmtPaperScore {
  testPoints: number;
  maxTestPoints: number;
  /** Null below the pass threshold: the paper is not passed. */
  scaledScore: number | null;
  tasks: NmtTaskScore[];
}

/**
 * Points one answer earns on its task, by the exam's rules
 * (docs/02-domain/nmt-paper.md). A question of the wrong type for the number,
 * no answer, or an answer that cannot be read all earn nothing — scoring a
 * finished paper never throws.
 */
export function taskPoints(
  task: NmtTask,
  question: ScorableQuestion,
  selectedAnswer: Prisma.JsonValue | null | undefined,
): number {
  if (question.type !== task.type || !isAnswerObject(selectedAnswer)) {
    return 0;
  }
  try {
    if (task.scoring === 'per-pair') {
      return Math.min(
        task.maxPoints,
        correctPairCount(
          selectedAnswer,
          question.answerOptions,
          question.configuration,
        ),
      );
    }
    if (task.scoring === 'sequence') {
      const orders = readSequenceOrders(selectedAnswer, question.answerOptions);
      const size = question.answerOptions.length;
      if (orders.length !== size) {
        return 0;
      }
      if (orders.every((order, index) => order === index)) {
        return task.maxPoints;
      }
      // Nothing in the middle counts: the exam pays only for the two ends.
      const ends =
        (orders[0] === 0 ? 1 : 0) + (orders[size - 1] === size - 1 ? 1 : 0);
      return Math.min(task.maxPoints - 1, ends);
    }
    if (task.scoring === 'per-correct') {
      const { chosen, correct } = countChosen(
        selectedAnswer,
        question.answerOptions,
      );
      // More marks than the paper asks for void the task, as on the sheet.
      return chosen > task.maxPoints ? 0 : Math.min(task.maxPoints, correct);
    }
    return evaluateAnswer(
      question.type,
      selectedAnswer,
      question.answerOptions,
      question.configuration,
    )
      ? task.maxPoints
      : 0;
  } catch {
    return 0;
  }
}

export function maxTestPoints(paper: NmtPaper): number {
  return paper.tasks.reduce((sum, task) => sum + task.maxPoints, 0);
}

/** The official 100–200 score for these test points, or null below the threshold. */
export function scaledScore(
  paper: NmtPaper,
  testPoints: number,
): number | null {
  if (testPoints < paper.scale.threshold) {
    return null;
  }
  return paper.scale.table[testPoints] ?? null;
}

/**
 * The whole paper: points per task in the paper's order, their sum, and the
 * score it converts to. Questions without a task number on this paper are left
 * out — a sitting is assembled from the paper, so there are none in practice.
 */
export function scorePaper(
  paper: NmtPaper,
  questions: ScorableQuestion[],
  answers: Map<string, Prisma.JsonValue | null>,
): NmtPaperScore {
  const tasks = questions
    .flatMap((question): NmtTaskScore[] => {
      const task = paper.tasks.find(
        (candidate) => candidate.number === question.nmtTask,
      );
      if (!task) {
        return [];
      }
      return [
        {
          number: task.number,
          label: taskLabel(task),
          questionId: question.id,
          points: taskPoints(task, question, answers.get(question.id)),
          maxPoints: task.maxPoints,
        },
      ];
    })
    .sort((a, b) => a.number - b.number);

  const testPoints = tasks.reduce((sum, task) => sum + task.points, 0);
  return {
    testPoints,
    maxTestPoints: maxTestPoints(paper),
    scaledScore: scaledScore(paper, testPoints),
    tasks,
  };
}

function isAnswerObject(
  value: Prisma.JsonValue | null | undefined,
): value is Record<string, unknown> & Prisma.JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
