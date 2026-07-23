-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "configuration" JSONB,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT false;
