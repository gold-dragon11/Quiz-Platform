-- AlterEnum
ALTER TYPE "NotificationKind" ADD VALUE 'MISTAKES_WAITING';

-- AlterTable
ALTER TABLE "user_settings" ADD COLUMN     "mistakeEmailsEnabled" BOOLEAN NOT NULL DEFAULT false;
