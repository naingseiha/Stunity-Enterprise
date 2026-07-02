-- Topic taxonomy under Subject (unit/chapter → optional child skill),
-- plus nullable per-question and per-recall-card topic tags.
-- Purely additive: no existing rows are touched.

-- CreateTable
CREATE TABLE "topics" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "nameKh" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "topics_subjectId_isActive_order_idx" ON "topics"("subjectId", "isActive", "order");

-- CreateIndex
CREATE INDEX "topics_parentId_idx" ON "topics"("parentId");

-- AddForeignKey
ALTER TABLE "topics" ADD CONSTRAINT "topics_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topics" ADD CONSTRAINT "topics_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "quiz_questions" ADD COLUMN "topicId" TEXT;

-- CreateIndex
CREATE INDEX "quiz_questions_topicId_idx" ON "quiz_questions"("topicId");

-- AddForeignKey
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "recall_cards" ADD COLUMN "topicId" TEXT;

-- CreateIndex
CREATE INDEX "recall_cards_topicId_idx" ON "recall_cards"("topicId");

-- AddForeignKey
ALTER TABLE "recall_cards" ADD CONSTRAINT "recall_cards_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;
