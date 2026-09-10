import { BadRequestException } from '@nestjs/common';
import { Prisma, QuestionType } from '@prisma/client';

/** The option facts needed to evaluate and review an answer. */
export interface EvaluableOption {
  id: string;
  order: number;
  isCorrect: boolean;
}

const INVALID_ANSWER_MESSAGE =
  'selectedAnswer does not match the question type or references unknown options.';

/** One matching pair keyed by option order (as stored in configuration). */
interface OrderPair {
  left: number;
  right: number;
}

/**
 * Evaluates a submitted answer against a question and returns whether it is
 * correct (docs/02-domain/answer-option.md §8-9, decisions D9, D10, D14).
 *
 * A structurally invalid answer — wrong shape, or an option id that does not
 * belong to this question — is a 400. A well-formed answer that simply does
 * not match the key is not an error; it is recorded as incorrect.
 */
export function evaluateAnswer(
  type: QuestionType,
  selectedAnswer: Record<string, unknown>,
  options: EvaluableOption[],
  configuration: Prisma.JsonValue,
): boolean {
  switch (type) {
    case QuestionType.SINGLE_CHOICE:
      return evaluateSingleChoice(selectedAnswer, options);
    case QuestionType.ORDERING:
      return evaluateOrdering(selectedAnswer, options);
    case QuestionType.MULTIPLE_CHOICE:
      return evaluateMultipleChoice(selectedAnswer, options);
    default:
      return evaluateMatching(selectedAnswer, options, configuration);
  }
}

/**
 * Reads a list of option ids from the answer under `field`, checking that
 * every id belongs to this question and that none repeats.
 *
 * A repeated id is rejected rather than deduplicated: it means the client is
 * confused about what it submitted, and silently accepting it would let a
 * three-of-seven answer be sent as the same option three times.
 */
function readOptionIds(
  selectedAnswer: Record<string, unknown>,
  field: string,
  options: EvaluableOption[],
): EvaluableOption[] {
  const keys = Object.keys(selectedAnswer);
  const value = selectedAnswer[field];
  if (keys.length !== 1 || keys[0] !== field || !Array.isArray(value)) {
    throw new BadRequestException(INVALID_ANSWER_MESSAGE);
  }

  const byId = new Map(options.map((option) => [option.id, option]));
  const seen = new Set<string>();
  return value.map((id) => {
    if (typeof id !== 'string' || seen.has(id)) {
      throw new BadRequestException(INVALID_ANSWER_MESSAGE);
    }
    seen.add(id);
    const option = byId.get(id);
    if (!option) {
      throw new BadRequestException(INVALID_ANSWER_MESSAGE);
    }
    return option;
  });
}

/**
 * The submitted sequence is right when it lists every option exactly once, in
 * the order they are stored. The stored `order` is the key here — which is
 * why the delivery view deals these options shuffled, the same way it deals
 * matching choices.
 *
 * A half-placed sequence is stored as an ordinary wrong answer rather than
 * rejected: the reader builds an ordering one item at a time, and every one of
 * those clicks autosaves. Matching behaves the same way — a partial set of
 * pairs is simply not the key.
 */
function evaluateOrdering(
  selectedAnswer: Record<string, unknown>,
  options: EvaluableOption[],
): boolean {
  const submitted = readOptionIds(selectedAnswer, 'sequence', options);
  // Persisted orders are always contiguous from zero (the admin API
  // normalizes them, and the seed writes them that way), so the key is simply
  // "position in the answer equals stored order".
  return (
    submitted.length === options.length &&
    submitted.every((option, index) => option.order === index)
  );
}

/**
 * Correct only when the chosen set is exactly the set of correct options —
 * every one of them and nothing else. Choosing two of the three right
 * statements is wrong, as it is on the exam, where the task is scored as a
 * whole.
 */
function evaluateMultipleChoice(
  selectedAnswer: Record<string, unknown>,
  options: EvaluableOption[],
): boolean {
  const submitted = readOptionIds(selectedAnswer, 'answerOptionIds', options);
  const correctCount = options.filter((option) => option.isCorrect).length;
  return (
    submitted.length === correctCount &&
    submitted.every((option) => option.isCorrect)
  );
}

function evaluateSingleChoice(
  selectedAnswer: Record<string, unknown>,
  options: EvaluableOption[],
): boolean {
  const keys = Object.keys(selectedAnswer);
  const answerOptionId = selectedAnswer.answerOptionId;
  if (
    keys.length !== 1 ||
    keys[0] !== 'answerOptionId' ||
    typeof answerOptionId !== 'string'
  ) {
    throw new BadRequestException(INVALID_ANSWER_MESSAGE);
  }

  const option = options.find((candidate) => candidate.id === answerOptionId);
  if (!option) {
    throw new BadRequestException(INVALID_ANSWER_MESSAGE);
  }
  return option.isCorrect;
}

function evaluateMatching(
  selectedAnswer: Record<string, unknown>,
  options: EvaluableOption[],
  configuration: Prisma.JsonValue,
): boolean {
  const keys = Object.keys(selectedAnswer);
  const pairs = selectedAnswer.pairs;
  if (keys.length !== 1 || keys[0] !== 'pairs' || !Array.isArray(pairs)) {
    throw new BadRequestException(INVALID_ANSWER_MESSAGE);
  }

  const orderById = new Map(options.map((option) => [option.id, option.order]));

  const submitted: OrderPair[] = pairs.map((pair): OrderPair => {
    if (typeof pair !== 'object' || pair === null || Array.isArray(pair)) {
      throw new BadRequestException(INVALID_ANSWER_MESSAGE);
    }
    const { left, right } = pair as { left?: unknown; right?: unknown };
    if (
      Object.keys(pair).length !== 2 ||
      typeof left !== 'string' ||
      typeof right !== 'string'
    ) {
      throw new BadRequestException(INVALID_ANSWER_MESSAGE);
    }
    const leftOrder = orderById.get(left);
    const rightOrder = orderById.get(right);
    if (leftOrder === undefined || rightOrder === undefined) {
      throw new BadRequestException(INVALID_ANSWER_MESSAGE);
    }
    return { left: leftOrder, right: rightOrder };
  });

  const correct = parseConfigurationPairs(configuration);
  return pairSetsEqual(submitted, correct);
}

/**
 * The correct answer in the same shape the client submitted (decision R4),
 * always with option **UUIDs**: SINGLE_CHOICE → `{ optionId }`, MATCHING →
 * `{ pairs: [{ left, right }] }` translated from the order-based
 * configuration, ORDERING → `{ sequence }` in the stored order, and
 * MULTIPLE_CHOICE → `{ answerOptionIds }` of every correct option.
 */
export function correctAnswerFor(
  type: QuestionType,
  options: EvaluableOption[],
  configuration: Prisma.JsonValue,
): Record<string, unknown> {
  if (type === QuestionType.SINGLE_CHOICE) {
    const correct = options.find((option) => option.isCorrect);
    return { optionId: correct?.id ?? null };
  }

  if (type === QuestionType.ORDERING) {
    const sequence = [...options]
      .sort((a, b) => a.order - b.order)
      .map((option) => option.id);
    return { sequence };
  }

  if (type === QuestionType.MULTIPLE_CHOICE) {
    return {
      answerOptionIds: options
        .filter((option) => option.isCorrect)
        .map((option) => option.id),
    };
  }

  const idByOrder = new Map(options.map((option) => [option.order, option.id]));
  const pairs = parseConfigurationPairs(configuration).map((pair) => ({
    left: idByOrder.get(pair.left) ?? null,
    right: idByOrder.get(pair.right) ?? null,
  }));
  return { pairs };
}

function parseConfigurationPairs(configuration: Prisma.JsonValue): OrderPair[] {
  if (
    typeof configuration !== 'object' ||
    configuration === null ||
    Array.isArray(configuration)
  ) {
    return [];
  }
  const pairs = (configuration as { pairs?: unknown }).pairs;
  if (!Array.isArray(pairs)) {
    return [];
  }
  return pairs
    .filter(
      (pair): pair is { left: number; right: number } =>
        typeof pair === 'object' &&
        pair !== null &&
        Number.isInteger((pair as { left?: unknown }).left) &&
        Number.isInteger((pair as { right?: unknown }).right),
    )
    .map((pair) => ({ left: pair.left, right: pair.right }));
}

/** Unordered, direction-sensitive set equality of matching pairs. */
function pairSetsEqual(a: OrderPair[], b: OrderPair[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const key = (pair: OrderPair): string => `${pair.left}:${pair.right}`;
  const setA = new Set(a.map(key));
  if (setA.size !== a.length) {
    // Duplicate submitted pairs can never match a well-formed key.
    return false;
  }
  return b.every((pair) => setA.has(key(pair)));
}
