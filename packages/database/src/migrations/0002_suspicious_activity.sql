ALTER TYPE "public"."incident_type" ADD VALUE IF NOT EXISTS 'SUSPICIOUS_ACTIVITY';--> statement-breakpoint
ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "metadata" jsonb;
