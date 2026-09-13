-- Two question shapes the exam uses and the schema did not have: a
-- chronological sequence (tasks 25-27 of the history paper) and "three
-- correct out of seven" (tasks 28-30). Adding enum values only: no existing
-- row changes, since every question in the bank is one of the first two types.
ALTER TYPE "QuestionType" ADD VALUE IF NOT EXISTS 'ORDERING';
ALTER TYPE "QuestionType" ADD VALUE IF NOT EXISTS 'MULTIPLE_CHOICE';
