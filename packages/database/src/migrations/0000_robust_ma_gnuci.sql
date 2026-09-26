DO $$ BEGIN
 CREATE TYPE "public"."alert_status" AS ENUM('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."chain_status" AS ENUM('HEALTHY', 'DEGRADED', 'DOWN', 'UNKNOWN');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."execution_mode" AS ENUM('SIMULATION', 'DISABLED', 'LIVE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."incident_severity" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."incident_status" AS ENUM('OPEN', 'INVESTIGATING', 'MITIGATED', 'RESOLVED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."incident_type" AS ENUM('HIGH_LATENCY', 'DELIVERY_FAILURE_SPIKE', 'MESSAGE_BACKLOG');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."lane_status" AS ENUM('ACTIVE', 'DEGRADED', 'INACTIVE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."message_state" AS ENUM('SENT', 'COMMITTED', 'EXECUTION_STARTED', 'DELIVERED', 'FAILED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."metric_window" AS ENUM('1m', '5m', '15m', '1h');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."response_status" AS ENUM('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXECUTED', 'EXECUTION_DISABLED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."response_type" AS ENUM('PAUSE_APPLICATION_ROUTE', 'BLOCK_SENDER', 'RATE_LIMIT_ADJUSTMENT');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(100) NOT NULL,
	"resource" varchar(255) NOT NULL,
	"threshold" real NOT NULL,
	"observed_value" real NOT NULL,
	"status" "alert_status" DEFAULT 'ACTIVE' NOT NULL,
	"message" text NOT NULL,
	"incident_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action" varchar(100) NOT NULL,
	"resource" varchar(100) NOT NULL,
	"resource_id" varchar(100) NOT NULL,
	"operator_id" varchar(100) NOT NULL,
	"operator_name" varchar(255) NOT NULL,
	"details" jsonb,
	"status" varchar(50) NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chain_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"rpc_url" text,
	"explorer_url" text,
	"status" "chain_status" DEFAULT 'UNKNOWN' NOT NULL,
	"last_activity_at" timestamp with time zone,
	"messages_count" integer DEFAULT 0 NOT NULL,
	"failures_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chains_chain_id_unique" UNIQUE("chain_id"),
	CONSTRAINT "chains_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "incidents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "incident_type" NOT NULL,
	"severity" "incident_severity" NOT NULL,
	"status" "incident_status" DEFAULT 'OPEN' NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text NOT NULL,
	"lane_id" uuid,
	"source_chain_name" varchar(100),
	"destination_chain_name" varchar(100),
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"detection_reason" text NOT NULL,
	"related_message_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lanes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_chain_id" integer NOT NULL,
	"destination_chain_id" integer NOT NULL,
	"source_chain_name" varchar(100) NOT NULL,
	"destination_chain_name" varchar(100) NOT NULL,
	"status" "lane_status" DEFAULT 'ACTIVE' NOT NULL,
	"message_count" integer DEFAULT 0 NOT NULL,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"backlog" integer DEFAULT 0 NOT NULL,
	"latency_p50" real,
	"latency_p90" real,
	"latency_p95" real,
	"latency_p99" real,
	"last_activity_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ccip_message_id" varchar(66) NOT NULL,
	"source_chain_id" integer NOT NULL,
	"destination_chain_id" integer NOT NULL,
	"source_chain_name" varchar(100) NOT NULL,
	"destination_chain_name" varchar(100) NOT NULL,
	"sender" varchar(42) NOT NULL,
	"receiver" varchar(42) NOT NULL,
	"state" "message_state" DEFAULT 'SENT' NOT NULL,
	"source_tx_hash" varchar(66),
	"destination_tx_hash" varchar(66),
	"source_block_number" integer,
	"destination_block_number" integer,
	"source_timestamp" timestamp with time zone,
	"destination_timestamp" timestamp with time zone,
	"latency_ms" real,
	"lane_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "messages_ccip_message_id_unique" UNIQUE("ccip_message_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "metric_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lane_id" uuid NOT NULL,
	"window" "metric_window" NOT NULL,
	"message_count" integer DEFAULT 0 NOT NULL,
	"success_count" integer DEFAULT 0 NOT NULL,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"latency_p50" real,
	"latency_p90" real,
	"latency_p95" real,
	"latency_p99" real,
	"backlog" integer DEFAULT 0 NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "response_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "response_type" NOT NULL,
	"status" "response_status" DEFAULT 'PENDING_APPROVAL' NOT NULL,
	"target" varchar(255) NOT NULL,
	"reason" text NOT NULL,
	"incident_id" uuid,
	"created_by" varchar(100) NOT NULL,
	"operator_id" varchar(100),
	"approved_by" varchar(100),
	"approved_at" timestamp with time zone,
	"executed_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"rejection_reason" text,
	"execution_mode" "execution_mode" DEFAULT 'DISABLED' NOT NULL,
	"execution_result" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rpc_health_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chain_id" integer NOT NULL,
	"chain_name" varchar(100) NOT NULL,
	"latency_ms" real NOT NULL,
	"is_healthy" boolean NOT NULL,
	"error_message" text,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
