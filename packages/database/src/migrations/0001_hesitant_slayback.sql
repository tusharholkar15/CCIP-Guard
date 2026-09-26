ALTER TABLE "messages" ADD COLUMN "sequence_number" bigint;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "source_chain_selector" varchar(30);--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "destination_chain_selector" varchar(30);--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "fee_token" varchar(42);--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "fee_token_amount" varchar(78);--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "message_hash" varchar(66);--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "execution_state" integer;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "gas_used" bigint;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "return_data" text;