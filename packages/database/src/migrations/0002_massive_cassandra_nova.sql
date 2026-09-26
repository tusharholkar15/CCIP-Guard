ALTER TYPE "incident_type" ADD VALUE 'SUSPICIOUS_ACTIVITY';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "indexer_checkpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chain_id" integer NOT NULL,
	"chain_name" varchar(100) NOT NULL,
	"last_processed_block" bigint NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "indexer_checkpoints_chain_id_unique" UNIQUE("chain_id")
);
--> statement-breakpoint
ALTER TABLE "incidents" ADD COLUMN "metadata" jsonb;