-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('ASSIGNMENT_ISSUED', 'ASSIGNMENT_DUE_SOON');

-- AlterTable
ALTER TABLE "user_settings" ADD COLUMN     "assignmentEmailsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "email_dispatches" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "kind" "NotificationKind" NOT NULL,
    "refId" UUID NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_dispatches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_dispatches_kind_sentAt_idx" ON "email_dispatches"("kind", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "email_dispatches_userId_kind_refId_key" ON "email_dispatches"("userId", "kind", "refId");

-- AddForeignKey
ALTER TABLE "email_dispatches" ADD CONSTRAINT "email_dispatches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
