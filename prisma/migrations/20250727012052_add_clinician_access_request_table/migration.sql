-- CreateTable
CREATE TABLE "clinician_access_requests" (
    "id" BIGSERIAL NOT NULL,
    "clinician_username" VARCHAR(128) NOT NULL,
    "customer_email" VARCHAR(128) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "requested_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinician_access_requests_pkey" PRIMARY KEY ("id")
);
