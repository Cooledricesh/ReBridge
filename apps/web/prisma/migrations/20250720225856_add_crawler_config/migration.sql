-- CreateTable
CREATE TABLE "crawler_configs" (
    "id" TEXT NOT NULL,
    "keywords" TEXT[] DEFAULT ARRAY['장애인']::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crawler_configs_pkey" PRIMARY KEY ("id")
);
