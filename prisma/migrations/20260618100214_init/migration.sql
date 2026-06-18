-- CreateTable
CREATE TABLE "plan_limits" (
    "code" TEXT NOT NULL,
    "max_dictionaries" INTEGER NOT NULL,
    "max_words_per_dict" INTEGER NOT NULL,

    CONSTRAINT "plan_limits_pkey" PRIMARY KEY ("code")
);

-- Seed default FREE plan limits (2 dictionaries / 100 words per dictionary).
-- Idempotent so re-applying / billing's plan.upserted event never conflicts.
INSERT INTO "plan_limits" ("code", "max_dictionaries", "max_words_per_dict")
VALUES ('FREE', 2, 100)
ON CONFLICT ("code") DO NOTHING;

-- CreateTable
CREATE TABLE "dictionaries" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "icon" TEXT NOT NULL,

    CONSTRAINT "dictionaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "words" (
    "id" SERIAL NOT NULL,
    "dictionary_id" INTEGER NOT NULL,
    "word" TEXT NOT NULL,
    "translation" TEXT NOT NULL,
    "transcription" TEXT,
    "example" TEXT,
    "description" TEXT,
    "points" INTEGER NOT NULL DEFAULT 0,
    "level" TEXT NOT NULL DEFAULT 'NEW',
    "last_studied_at" TIMESTAMP(3),
    "next_review_at" TIMESTAMP(3),

    CONSTRAINT "words_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_sessions" (
    "id" SERIAL NOT NULL,
    "dictionary_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "study_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_studySessionToword" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_studySessionToword_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "study_sessions_dictionary_id_date_key" ON "study_sessions"("dictionary_id", "date");

-- CreateIndex
CREATE INDEX "_studySessionToword_B_index" ON "_studySessionToword"("B");

-- AddForeignKey
ALTER TABLE "words" ADD CONSTRAINT "words_dictionary_id_fkey" FOREIGN KEY ("dictionary_id") REFERENCES "dictionaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_dictionary_id_fkey" FOREIGN KEY ("dictionary_id") REFERENCES "dictionaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_studySessionToword" ADD CONSTRAINT "_studySessionToword_A_fkey" FOREIGN KEY ("A") REFERENCES "study_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_studySessionToword" ADD CONSTRAINT "_studySessionToword_B_fkey" FOREIGN KEY ("B") REFERENCES "words"("id") ON DELETE CASCADE ON UPDATE CASCADE;
