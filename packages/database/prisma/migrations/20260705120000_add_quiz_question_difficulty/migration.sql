-- Nullable per-question difficulty (1=easiest..5=hardest) so the Learn-tab
-- practice ladder can serve real difficulty-banded questions instead of the
-- same undifferentiated pool at every stage. Purely additive: no existing
-- rows are touched; existing questions get difficulty=NULL until backfilled
-- (see scripts/classify-question-difficulty.ts) or authored going forward.

-- AlterTable
ALTER TABLE "quiz_questions" ADD COLUMN "difficulty" INTEGER;
