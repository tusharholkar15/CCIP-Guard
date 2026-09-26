ALTER TYPE "message_state" ADD VALUE 'DISCOVERED';--> statement-breakpoint
ALTER TYPE "message_state" ADD VALUE 'PROCESSING';--> statement-breakpoint
ALTER TYPE "message_state" ADD VALUE 'DESTINATION_DETECTED';--> statement-breakpoint
ALTER TYPE "message_state" ADD VALUE 'EXECUTED';--> statement-breakpoint
ALTER TYPE "message_state" ADD VALUE 'SUCCESS';--> statement-breakpoint
ALTER TYPE "message_state" ADD VALUE 'TIMEOUT';--> statement-breakpoint
ALTER TYPE "message_state" ADD VALUE 'UNKNOWN';--> statement-breakpoint
ALTER TYPE "message_state" ADD VALUE 'REORGED';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ccip_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ccip_message_id" varchar(66),
	"chain_id" integer NOT NULL,
	"transaction_hash" varchar(66) NOT NULL,
	"block_number" bigint NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"contract_address" varchar(42) NOT NULL,
	"event_name" varchar(100) NOT NULL,
	"log_index" integer NOT NULL,
	"args" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unq_ccip_event" UNIQUE("chain_id","transaction_hash","log_index")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chain_id" integer NOT NULL,
	"hash" varchar(66) NOT NULL,
	"block_number" bigint NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"from" varchar(42),
	"to" varchar(42),
	"value" varchar(78),
	"ccip_relation" varchar(50),
	"status" varchar(20),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unq_transaction" UNIQUE("chain_id","hash")
);
