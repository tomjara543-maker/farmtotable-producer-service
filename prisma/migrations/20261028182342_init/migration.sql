-- CreateEnum
CREATE TYPE "CertificationType" AS ENUM ('ORGANIC', 'FAIR_TRADE', 'DESIGNATION_OF_ORIGIN');

-- CreateTable
CREATE TABLE "producers" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "farm_name" TEXT NOT NULL,
    "location_lat" DOUBLE PRECISION NOT NULL,
    "location_lng" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "producers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certifications" (
    "id" TEXT NOT NULL,
    "producer_id" TEXT NOT NULL,
    "type" "CertificationType" NOT NULL,
    "valid_until" TEXT NOT NULL,

    CONSTRAINT "certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processed_events" (
    "event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_events_pkey" PRIMARY KEY ("event_id")
);

-- CreateIndex
CREATE INDEX "producers_owner_id_idx" ON "producers"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "certifications_producer_id_type_key" ON "certifications"("producer_id", "type");

-- AddForeignKey
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_producer_id_fkey" FOREIGN KEY ("producer_id") REFERENCES "producers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
