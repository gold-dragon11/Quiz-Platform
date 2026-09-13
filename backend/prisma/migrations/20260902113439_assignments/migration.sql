-- CreateEnum
CREATE TYPE "ScoredAttempt" AS ENUM ('FIRST', 'LAST', 'BEST');

-- CreateEnum
CREATE TYPE "ExplanationVisibility" AS ENUM ('IMMEDIATE', 'AFTER_SUBMIT', 'AFTER_DUE');

-- AlterTable
ALTER TABLE "quiz_sessions" ADD COLUMN     "assignmentId" UUID;

-- CreateTable
CREATE TABLE "assignments" (
    "id" UUID NOT NULL,
    "groupId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "openAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3) NOT NULL,
    "attemptsAllowed" INTEGER NOT NULL DEFAULT 1,
    "scoredAttempt" "ScoredAttempt" NOT NULL DEFAULT 'FIRST',
    "explanations" "ExplanationVisibility" NOT NULL DEFAULT 'AFTER_SUBMIT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_questions" (
    "id" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "assignment_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_targets" (
    "id" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "studentId" UUID NOT NULL,

    CONSTRAINT "assignment_targets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assignments_groupId_idx" ON "assignments"("groupId");

-- CreateIndex
CREATE INDEX "assignments_groupId_dueAt_idx" ON "assignments"("groupId", "dueAt");

-- CreateIndex
CREATE INDEX "assignment_questions_assignmentId_idx" ON "assignment_questions"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "assignment_questions_assignmentId_questionId_key" ON "assignment_questions"("assignmentId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "assignment_questions_assignmentId_order_key" ON "assignment_questions"("assignmentId", "order");

-- CreateIndex
CREATE INDEX "assignment_targets_studentId_idx" ON "assignment_targets"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "assignment_targets_assignmentId_studentId_key" ON "assignment_targets"("assignmentId", "studentId");

-- CreateIndex
CREATE INDEX "quiz_sessions_assignmentId_idx" ON "quiz_sessions"("assignmentId");

-- AddForeignKey
ALTER TABLE "quiz_sessions" ADD CONSTRAINT "quiz_sessions_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_questions" ADD CONSTRAINT "assignment_questions_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_questions" ADD CONSTRAINT "assignment_questions_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_targets" ADD CONSTRAINT "assignment_targets_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_targets" ADD CONSTRAINT "assignment_targets_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
