-- CreateEnum
CREATE TYPE "assessment_status" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "scoring_method" AS ENUM ('CORRECT_ANSWER', 'ALIGNMENT');

-- CreateEnum
CREATE TYPE "question_type" AS ENUM ('SINGLE_CHOICE', 'TRUE_FALSE', 'RATING_SCALE', 'CHOICE_SCALE');

-- CreateEnum
CREATE TYPE "question_order" AS ENUM ('FIXED', 'SHUFFLE_WITHIN_SECTION', 'SHUFFLE_ALL');

-- CreateEnum
CREATE TYPE "difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "attempt_status" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "assessments" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "description" TEXT,
    "level" TEXT,
    "relevant_for" TEXT,
    "instructions" TEXT,
    "duration_minutes" INTEGER NOT NULL,
    "scoring_method" "scoring_method" NOT NULL DEFAULT 'CORRECT_ANSWER',
    "status" "assessment_status" NOT NULL DEFAULT 'DRAFT',
    "question_order" "question_order" NOT NULL DEFAULT 'FIXED',
    "shuffle_options" BOOLEAN NOT NULL DEFAULT false,
    "allow_back_navigation" BOOLEAN NOT NULL DEFAULT true,
    "audio_replays" INTEGER NOT NULL DEFAULT 1,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_sections" (
    "id" UUID NOT NULL,
    "assessment_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "weight" DOUBLE PRECISION,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "assessment_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" UUID NOT NULL,
    "assessment_id" UUID NOT NULL,
    "section_id" UUID,
    "order" INTEGER NOT NULL,
    "ref" TEXT,
    "type" "question_type" NOT NULL DEFAULT 'SINGLE_CHOICE',
    "instruction" TEXT,
    "context" TEXT,
    "stem" TEXT NOT NULL,
    "media_id" UUID,
    "media_file_name" TEXT,
    "employer_prompt" TEXT,
    "default_employer_value" INTEGER,
    "difficulty" "difficulty",
    "rationale" TEXT,
    "transcript" TEXT,
    "shuffle_options" BOOLEAN,
    "keep_last_option_fixed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_options" (
    "id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "employer_text" TEXT,
    "value" INTEGER,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "question_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "score_bands" (
    "id" UUID NOT NULL,
    "assessment_id" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "min_score" DOUBLE PRECISION NOT NULL,
    "label" TEXT NOT NULL,
    "interpretation" TEXT,
    "recommended_action" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "score_bands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "original_name" TEXT NOT NULL,
    "uploaded_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_invitations" (
    "id" UUID NOT NULL,
    "candidate_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "sent_at" TIMESTAMPTZ(3),
    "sent_by_id" UUID,
    "message" TEXT,
    "last_opened_at" TIMESTAMPTZ(3),
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "assessment_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_attempts" (
    "id" UUID NOT NULL,
    "invitation_id" UUID NOT NULL,
    "assessment_id" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "status" "attempt_status" NOT NULL DEFAULT 'NOT_STARTED',
    "started_at" TIMESTAMPTZ(3),
    "deadline_at" TIMESTAMPTZ(3),
    "finished_at" TIMESTAMPTZ(3),
    "layout" JSONB,
    "score" DOUBLE PRECISION,
    "band_label" TEXT,
    "correct_count" INTEGER,
    "question_count" INTEGER,
    "section_scores" JSONB,
    "flags" JSONB,
    "time_taken_seconds" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "assessment_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempt_answers" (
    "id" UUID NOT NULL,
    "attempt_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "option_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "attempt_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assessments_slug_key" ON "assessments"("slug");

-- CreateIndex
CREATE INDEX "assessment_sections_assessment_id_order_idx" ON "assessment_sections"("assessment_id", "order");

-- CreateIndex
CREATE INDEX "questions_assessment_id_order_idx" ON "questions"("assessment_id", "order");

-- CreateIndex
CREATE INDEX "questions_section_id_idx" ON "questions"("section_id");

-- CreateIndex
CREATE INDEX "questions_media_id_idx" ON "questions"("media_id");

-- CreateIndex
CREATE INDEX "question_options_question_id_order_idx" ON "question_options"("question_id", "order");

-- CreateIndex
CREATE INDEX "score_bands_assessment_id_order_idx" ON "score_bands"("assessment_id", "order");

-- CreateIndex
CREATE UNIQUE INDEX "media_assets_key_key" ON "media_assets"("key");

-- CreateIndex
CREATE INDEX "media_assets_original_name_idx" ON "media_assets"("original_name");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_email_key" ON "candidates"("email");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_invitations_token_hash_key" ON "assessment_invitations"("token_hash");

-- CreateIndex
CREATE INDEX "assessment_invitations_candidate_id_idx" ON "assessment_invitations"("candidate_id");

-- CreateIndex
CREATE INDEX "assessment_invitations_created_at_idx" ON "assessment_invitations"("created_at");

-- CreateIndex
CREATE INDEX "assessment_attempts_assessment_id_status_idx" ON "assessment_attempts"("assessment_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_attempts_invitation_id_assessment_id_key" ON "assessment_attempts"("invitation_id", "assessment_id");

-- CreateIndex
CREATE UNIQUE INDEX "attempt_answers_attempt_id_question_id_key" ON "attempt_answers"("attempt_id", "question_id");

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_sections" ADD CONSTRAINT "assessment_sections_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "assessment_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_bands" ADD CONSTRAINT "score_bands_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_invitations" ADD CONSTRAINT "assessment_invitations_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_invitations" ADD CONSTRAINT "assessment_invitations_sent_by_id_fkey" FOREIGN KEY ("sent_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "assessment_invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_answers" ADD CONSTRAINT "attempt_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "assessment_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
