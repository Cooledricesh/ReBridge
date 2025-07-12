-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "is_registered_disability" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT,
    "location_json" JSONB,
    "salary_range" JSONB,
    "employment_type" TEXT,
    "description" TEXT,
    "is_disability_friendly" BOOLEAN NOT NULL DEFAULT false,
    "crawled_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3),
    "raw_data" JSONB,
    "search_vector" tsvector,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_saved_jobs" (
    "user_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "saved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_saved_jobs_pkey" PRIMARY KEY ("user_id","job_id")
);

-- CreateTable
CREATE TABLE "crawl_logs" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "jobs_found" INTEGER NOT NULL,
    "jobs_new" INTEGER NOT NULL,
    "jobs_updated" INTEGER NOT NULL,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "crawl_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "jobs_crawled_at_idx" ON "jobs"("crawled_at" DESC);

-- CreateIndex
CREATE INDEX "jobs_company_title_idx" ON "jobs"("company", "title");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_source_external_id_key" ON "jobs"("source", "external_id");

-- AddForeignKey
ALTER TABLE "user_saved_jobs" ADD CONSTRAINT "user_saved_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_saved_jobs" ADD CONSTRAINT "user_saved_jobs_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
