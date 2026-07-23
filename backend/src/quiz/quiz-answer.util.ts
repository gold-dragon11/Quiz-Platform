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
  if (type === QuestionType.SINGLE_CHOICE) {
    return evaluateSingleChoice(selectedAnswer, options);
  }
  return evaluateMatching(selectedAnswer, options, configuration);
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
 * The correct answer in the same shape the client submitted (decision R4):
 * SINGLE_CHOICE → `{ optionId }`, MATCHING → `{ pairs: [{ left, right }] }`
 * with option **UUIDs**, translated from the order-based configuration.
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
