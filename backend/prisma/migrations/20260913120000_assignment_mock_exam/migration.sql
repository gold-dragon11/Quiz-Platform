-- A mock exam set as homework: the group subject's NMT paper, drawn once at
-- issue (docs/00-overview/teacher-side-decisions.md, decision 29).
ALTER TABLE "assignments" ADD COLUMN "mockExam" BOOLEAN NOT NULL DEFAULT false;
