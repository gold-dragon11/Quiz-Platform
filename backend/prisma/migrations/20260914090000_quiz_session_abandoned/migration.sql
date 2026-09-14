-- A session left untouched for seven days is closed without counting
-- (docs/00-overview/teacher-side-decisions.md decision 23).
ALTER TYPE "QuizStatus" ADD VALUE 'ABANDONED';
