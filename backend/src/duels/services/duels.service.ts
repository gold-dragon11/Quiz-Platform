import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccountStatus, DuelStatus, QuizStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QuizService } from '../../quiz/services/quiz.service';
import { QuizSessionMetadata } from '../../quiz/types/quiz.types';
import { CreateDuelDto } from '../dto/create-duel.dto';
import { DuelRow, DuelsRepository } from '../repositories/duels.repository';
import { DuelOutcome, DuelPlayer, DuelView } from '../types/duel.types';

const DUEL_NOT_FOUND_MESSAGE = 'Дуель не знайдено.';
const OPPONENT_NOT_FOUND_MESSAGE = 'Такого користувача не знайдено.';
const SELF_CHALLENGE_MESSAGE = 'Не можна викликати самого себе.';
const NOT_YOUR_INVITE_MESSAGE = 'Цей виклик адресований не вам.';
const NOT_PENDING_MESSAGE = 'На цей виклик уже відповіли.';
const NOT_ACCEPTED_MESSAGE = 'Виклик ще не прийнято.';
const ALREADY_PLAYED_MESSAGE = 'Ви вже пройшли цю дуель.';
const EXPIRED_MESSAGE = 'Термін цього виклику минув.';
const NOT_ENOUGH_QUESTIONS_MESSAGE =
  'Для дуелі з цієї теми бракує опублікованих питань.';

/** An unanswered challenge goes stale rather than sitting in a list forever. */
const INVITE_LIFETIME_HOURS = 48;
/** Short by design: a duel is a round, not a sitting. */
const DEFAULT_QUESTION_COUNT = 10;

/**
 * Asynchronous duels (docs/02-domain/duel.md, decision 21).
 *
 * Both players sit the same paper whenever they like, and the result is a
 * comparison. No real-time anything, which is the point of shipping this half
 * first: it works on a free instance that sleeps, while a live duel with a
 * twenty-second timer does not.
 *
 * The play itself is the ordinary quiz engine — same questions route, same
 * answers, same review with explanations. That is what separates this from a
 * quiz show: you find out *why* you lost a question.
 */
@Injectable()
export class DuelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly duelsRepository: DuelsRepository,
    private readonly quizService: QuizService,
  ) {}

  /** Challenges somebody by username. The paper is not drawn until they accept. */
  async challenge(challengerId: string, dto: CreateDuelDto): Promise<DuelView> {
    const opponent = await this.duelsRepository.findUserByUsername(
      dto.opponentUsername,
    );
    if (!opponent || opponent.accountStatus !== AccountStatus.ACTIVE) {
      throw new NotFoundException(OPPONENT_NOT_FOUND_MESSAGE);
    }
    // Demo accounts duel only each other: a duel with a real learner would be
    // deleted, their half included, by the nightly reset. Answered as an
    // unknown username, so it reveals nothing about either account.
    if (
      opponent.isDemo !==
      (await this.duelsRepository.isDemoAccount(challengerId))
    ) {
      throw new NotFoundException(OPPONENT_NOT_FOUND_MESSAGE);
    }
    if (opponent.id === challengerId) {
      throw new BadRequestException(SELF_CHALLENGE_MESSAGE);
    }

    const questionCount = dto.questionCount ?? DEFAULT_QUESTION_COUNT;

    // Checked before the invite goes out, not after it is accepted: being told
    // the topic is too thin is annoying, being told it after your opponent
    // agreed to play is worse.
    const available = await this.duelsRepository.selectQuestionsForPair({
      subjectId: dto.subjectId,
      topicId: dto.topicId ?? null,
      count: questionCount,
      firstUserId: challengerId,
      secondUserId: opponent.id,
    });
    if (available.length < questionCount) {
      throw new ConflictException(NOT_ENOUGH_QUESTIONS_MESSAGE);
    }

    const duel = await this.prisma.$transaction((tx) =>
      this.duelsRepository.create(tx, {
        challengerId,
        opponentId: opponent.id,
        subjectId: dto.subjectId,
        topicId: dto.topicId ?? null,
        questionCount,
        expiresAt: new Date(
          Date.now() + INVITE_LIFETIME_HOURS * 60 * 60 * 1000,
        ),
      }),
    );

    return this.toView(duel, challengerId);
  }

  /**
   * Accepts a challenge and freezes the paper.
   *
   * Drawn here rather than at invite time so the questions reflect what
   * neither player has seen *now* — an invite left for two days would
   * otherwise hand out a paper chosen before either of them practised.
   */
  async accept(userId: string, duelId: string): Promise<DuelView> {
    const duel = await this.requirePending(userId, duelId);

    const questionIds = await this.duelsRepository.selectQuestionsForPair({
      subjectId: duel.subject.id,
      topicId: duel.topic?.id ?? null,
      count: duel.questionCount,
      firstUserId: duel.challengerId,
      secondUserId: duel.opponentId,
    });
    if (questionIds.length < duel.questionCount) {
      throw new ConflictException(NOT_ENOUGH_QUESTIONS_MESSAGE);
    }

    await this.prisma.$transaction(async (tx) => {
      await this.duelsRepository.setQuestions(tx, duelId, questionIds);
      await tx.duel.update({
        where: { id: duelId },
        data: { status: DuelStatus.ACCEPTED, acceptedAt: new Date() },
      });
    });

    return this.findOne(userId, duelId);
  }

  async decline(userId: string, duelId: string): Promise<DuelView> {
    await this.requirePending(userId, duelId);
    const duel = await this.duelsRepository.updateStatus(duelId, {
      status: DuelStatus.DECLINED,
    });
    return this.toView(duel, userId);
  }

  /**
   * Starts this player's half. Both halves are ordinary sessions over the same
   * frozen paper, in the same order — otherwise the loser can always blame an
   * easier draw.
   */
  async play(userId: string, duelId: string): Promise<QuizSessionMetadata> {
    const duel = await this.requireParticipant(userId, duelId);

    if (duel.status !== DuelStatus.ACCEPTED) {
      throw new ConflictException(
        duel.status === DuelStatus.PENDING
          ? NOT_ACCEPTED_MESSAGE
          : NOT_PENDING_MESSAGE,
      );
    }

    const mine = duel.sessions.find((session) => session.userId === userId);
    if (mine?.status === QuizStatus.COMPLETED) {
      throw new ConflictException(ALREADY_PLAYED_MESSAGE);
    }

    const questionIds = await this.duelsRepository.findQuestionIds(duelId);
    return this.quizService.startForDuel(userId, {
      duelId,
      subjectId: duel.subject.id,
      topicId: duel.topic?.id ?? null,
      questionIds,
    });
  }

  async findOne(userId: string, duelId: string): Promise<DuelView> {
    const duel = await this.requireParticipant(userId, duelId);
    return this.toView(await this.settleIfFinished(duel), userId);
  }

  /**
   * For the hourly sweep. Listing duels still expires them too — the sweep
   * only means a stale challenge no longer waits for someone to look.
   */
  async expireStaleChallenges(): Promise<number> {
    return this.duelsRepository.expireStale();
  }

  /** Every duel this person is in, newest first, stale invites marked as such. */
  async list(userId: string): Promise<DuelView[]> {
    await this.duelsRepository.expireStale();
    const duels = await this.duelsRepository.listForUser(userId);

    const settled = await Promise.all(
      duels.map((duel) => this.settleIfFinished(duel)),
    );
    return settled.map((duel) => this.toView(duel, userId));
  }

  // ----------------------------------------------------------------- shared

  /**
   * Marks a duel complete once both halves are in.
   *
   * Done on read rather than when a session finishes: the quiz engine has no
   * business knowing what a duel is, and a duel that settles the moment
   * somebody looks at it is indistinguishable, to a player, from one that
   * settled the instant the second player pressed finish.
   */
  private async settleIfFinished(duel: DuelRow): Promise<DuelRow> {
    if (
      duel.status !== DuelStatus.ACCEPTED ||
      !this.duelsRepository.bothFinished(duel)
    ) {
      return duel;
    }
    return this.duelsRepository.updateStatus(duel.id, {
      status: DuelStatus.COMPLETED,
      completedAt: new Date(),
    });
  }

  private async requireParticipant(
    userId: string,
    duelId: string,
  ): Promise<DuelRow> {
    const duel = await this.duelsRepository.findById(duelId);
    if (!duel || (duel.challengerId !== userId && duel.opponentId !== userId)) {
      throw new NotFoundException(DUEL_NOT_FOUND_MESSAGE);
    }
    return duel;
  }

  private async requirePending(
    userId: string,
    duelId: string,
  ): Promise<DuelRow> {
    const duel = await this.requireParticipant(userId, duelId);

    // Only the person challenged may answer the challenge.
    if (duel.opponentId !== userId) {
      throw new ConflictException(NOT_YOUR_INVITE_MESSAGE);
    }
    if (duel.status !== DuelStatus.PENDING) {
      throw new ConflictException(NOT_PENDING_MESSAGE);
    }
    if (duel.expiresAt.getTime() < Date.now()) {
      throw new ConflictException(EXPIRED_MESSAGE);
    }
    return duel;
  }

  private toView(duel: DuelRow, viewerId: string): DuelView {
    const both = this.duelsRepository.bothFinished(duel);

    return {
      id: duel.id,
      mode: duel.mode,
      status: duel.status,
      subject: duel.subject,
      topic: duel.topic,
      questionCount: duel.questionCount,
      challenger: this.toPlayer(duel, duel.challengerId, both),
      opponent: this.toPlayer(duel, duel.opponentId, both),
      winner: both ? this.outcome(duel) : null,
      expiresAt: duel.expiresAt,
      createdAt: duel.createdAt,
      completedAt: duel.completedAt,
      mySessionId:
        duel.sessions.find((session) => session.userId === viewerId)?.id ??
        null,
    };
  }

  /**
   * A player's side. Scores stay hidden until both are done — seeing what you
   * have to beat before you play is not a duel, it is a target.
   */
  private toPlayer(
    duel: DuelRow,
    playerId: string,
    reveal: boolean,
  ): DuelPlayer {
    const person =
      playerId === duel.challengerId ? duel.challenger : duel.opponent;
    const session = duel.sessions.find(
      (candidate) => candidate.userId === playerId,
    );
    const finished = session?.status === QuizStatus.COMPLETED;

    return {
      id: person.id,
      displayName: person.profile?.displayName ?? null,
      username: person.profile?.username ?? null,
      finished,
      score:
        reveal && session?.result
          ? {
              correctAnswers: session.result.correctAnswers,
              totalQuestions: session.result.totalQuestions,
              accuracy: Number(session.result.accuracy),
              durationSeconds: session.durationSeconds,
            }
          : null,
    };
  }

  /**
   * Accuracy decides; time breaks a tie. Two people who both got everything
   * right are not equal if one took a third of the time — and rewarding speed
   * only after correctness keeps the incentive on being right.
   */
  private outcome(duel: DuelRow): DuelOutcome {
    const challenger = duel.sessions.find(
      (session) => session.userId === duel.challengerId,
    );
    const opponent = duel.sessions.find(
      (session) => session.userId === duel.opponentId,
    );
    if (!challenger?.result || !opponent?.result) {
      return 'DRAW';
    }

    const byAccuracy =
      Number(challenger.result.accuracy) - Number(opponent.result.accuracy);
    if (byAccuracy !== 0) {
      return byAccuracy > 0 ? 'CHALLENGER' : 'OPPONENT';
    }

    const challengerTime = challenger.durationSeconds;
    const opponentTime = opponent.durationSeconds;
    if (challengerTime === null || opponentTime === null) {
      return 'DRAW';
    }
    if (challengerTime === opponentTime) {
      return 'DRAW';
    }
    return challengerTime < opponentTime ? 'CHALLENGER' : 'OPPONENT';
  }
}
