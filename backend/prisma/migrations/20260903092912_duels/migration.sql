-- CreateEnum
CREATE TYPE "DuelMode" AS ENUM ('ASYNC', 'LIVE');

-- CreateEnum
CREATE TYPE "DuelStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'COMPLETED', 'EXPIRED');

-- AlterEnum
ALTER TYPE "QuizType" ADD VALUE 'DUEL';

-- AlterTable
ALTER TABLE "quiz_sessions" ADD COLUMN     "duelId" UUID;

-- CreateTable
CREATE TABLE "duels" (
    "id" UUID NOT NULL,
    "challengerId" UUID NOT NULL,
    "opponentId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "topicId" UUID,
    "mode" "DuelMode" NOT NULL DEFAULT 'ASYNC',
    "status" "DuelStatus" NOT NULL DEFAULT 'PENDING',
    "questionCount" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "duels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "duel_questions" (
    "id" UUID NOT NULL,
    "duelId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "duel_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "duels_challengerId_status_idx" ON "duels"("challengerId", "status");

-- CreateIndex
CREATE INDEX "duels_opponentId_status_idx" ON "duels"("opponentId", "status");

-- CreateIndex
CREATE INDEX "duels_status_expiresAt_idx" ON "duels"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "duel_questions_duelId_idx" ON "duel_questions"("duelId");

-- CreateIndex
CREATE UNIQUE INDEX "duel_questions_duelId_order_key" ON "duel_questions"("duelId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "duel_questions_duelId_questionId_key" ON "duel_questions"("duelId", "questionId");

-- CreateIndex
CREATE INDEX "quiz_sessions_duelId_idx" ON "quiz_sessions"("duelId");

-- AddForeignKey
ALTER TABLE "quiz_sessions" ADD CONSTRAINT "quiz_sessions_duelId_fkey" FOREIGN KEY ("duelId") REFERENCES "duels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duels" ADD CONSTRAINT "duels_challengerId_fkey" FOREIGN KEY ("challengerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duels" ADD CONSTRAINT "duels_opponentId_fkey" FOREIGN KEY ("opponentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duels" ADD CONSTRAINT "duels_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duels" ADD CONSTRAINT "duels_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duel_questions" ADD CONSTRAINT "duel_questions_duelId_fkey" FOREIGN KEY ("duelId") REFERENCES "duels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duel_questions" ADD CONSTRAINT "duel_questions_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
