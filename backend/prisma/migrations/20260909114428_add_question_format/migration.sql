-- CreateEnum
CREATE TYPE "QuestionFormat" AS ENUM ('PRACTICE', 'NMT');

-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "format" "QuestionFormat" NOT NULL DEFAULT 'PRACTICE';
