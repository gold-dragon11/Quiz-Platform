-- The mathematics paper ends with four open questions: work the answer out and
-- write the number. Adding an enum value only; no existing row changes, since
-- nothing in the bank is of this type yet.
ALTER TYPE "QuestionType" ADD VALUE IF NOT EXISTS 'NUMERIC';
