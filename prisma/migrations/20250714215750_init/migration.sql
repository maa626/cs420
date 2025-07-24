-- CreateTable
CREATE TABLE "users" (
    "id" BIGINT GENERATED ALWAYS AS IDENTITY,
    "user_name" VARCHAR(128) NOT NULL,
    "email" VARCHAR(128) NOT NULL,
    "password" VARCHAR(64) NOT NULL,
    "birth_date" DATE NOT NULL,
    "phone" VARCHAR(32) NOT NULL,
    "region" VARCHAR(32) NOT NULL,
    "agreed_to_terms_of_use_at" TIMESTAMP(3),
    "agreed_to_cookie_policy_at" TIMESTAMP(3),
    "agreed_to_privacy_policy_at" TIMESTAMP(3),
    "agreed_to_text_messages_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" BIGINT GENERATED ALWAYS AS IDENTITY,
    "user_id" BIGINT NOT NULL,
    "token" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" BIGINT GENERATED ALWAYS AS IDENTITY,
    "user_id" BIGINT NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "birth_date" DATE NOT NULL,
    "gender" VARCHAR(64) NOT NULL,
    "email" VARCHAR(128) NOT NULL,
    "phone" VARCHAR(32) NOT NULL,
    "region" VARCHAR(32) NOT NULL,
    "whatsapp_phone" VARCHAR(32) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" BIGINT GENERATED ALWAYS AS IDENTITY,
    "customer_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessments" (
    "id" BIGINT GENERATED ALWAYS AS IDENTITY,
    "customer_id" BIGINT NOT NULL,
    "device_id" BIGINT NOT NULL,
    "started_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "points" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "customers_phone_key" ON "customers"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "customers_whatsapp_phone_key" ON "customers"("whatsapp_phone");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;