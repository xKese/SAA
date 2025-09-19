CREATE TABLE "analysis_patterns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pattern_type" text NOT NULL,
	"pattern_data" json NOT NULL,
	"frequency" integer DEFAULT 1,
	"reliability" numeric(3, 2) DEFAULT '0.50',
	"last_observed" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"is_active" text DEFAULT 'true'
);
--> statement-breakpoint
CREATE TABLE "analysis_phases" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"portfolio_id" varchar,
	"phase_number" integer NOT NULL,
	"phase_name" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"results" json
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar,
	"sender" text NOT NULL,
	"message_type" text DEFAULT 'text',
	"content" text NOT NULL,
	"metadata" json,
	"timestamp" timestamp DEFAULT now(),
	"is_deleted" text DEFAULT 'false'
);
--> statement-breakpoint
CREATE TABLE "chat_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"portfolio_id" varchar,
	"user_id" varchar,
	"session_name" text DEFAULT 'New Chat',
	"context" json,
	"created_at" timestamp DEFAULT now(),
	"last_message_at" timestamp DEFAULT now(),
	"is_active" text DEFAULT 'true'
);
--> statement-breakpoint
CREATE TABLE "knowledge_base" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"portfolio_id" varchar,
	"analysis_type" text NOT NULL,
	"data" json NOT NULL,
	"insights" text,
	"confidence" numeric(3, 2),
	"tags" text[],
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"is_valid" text DEFAULT 'true'
);
--> statement-breakpoint
CREATE TABLE "portfolio_positions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"portfolio_id" varchar,
	"name" text NOT NULL,
	"isin" text,
	"value" numeric(15, 2) NOT NULL,
	"percentage" numeric(5, 2),
	"instrument_type" text,
	"sector" text,
	"geography" text,
	"currency" text,
	"asset_class" text,
	"analysis_status" text DEFAULT 'pending'
);
--> statement-breakpoint
CREATE TABLE "portfolio_snapshots" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"portfolio_id" varchar,
	"snapshot_type" text NOT NULL,
	"positions" json NOT NULL,
	"analysis_results" json,
	"total_value" numeric(15, 2),
	"metadata" json,
	"created_at" timestamp DEFAULT now(),
	"description" text
);
--> statement-breakpoint
CREATE TABLE "portfolios" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"file_name" text NOT NULL,
	"uploaded_at" timestamp DEFAULT now(),
	"analysis_status" text DEFAULT 'pending' NOT NULL,
	"analysis_progress" integer DEFAULT 0,
	"current_phase" text DEFAULT 'Phase 0: Instrumentenidentifikation',
	"total_value" numeric(15, 2),
	"position_count" integer,
	"analysis_results" json
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"preference_type" text NOT NULL,
	"preference_value" json NOT NULL,
	"portfolio_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "analysis_phases" ADD CONSTRAINT "analysis_phases_portfolio_id_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_portfolio_id_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_base" ADD CONSTRAINT "knowledge_base_portfolio_id_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_positions" ADD CONSTRAINT "portfolio_positions_portfolio_id_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_snapshots" ADD CONSTRAINT "portfolio_snapshots_portfolio_id_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_portfolio_id_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE no action ON UPDATE no action;