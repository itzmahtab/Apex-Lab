CREATE TABLE "comparisons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"session_id" uuid NOT NULL,
	"driver_a_id" uuid NOT NULL,
	"driver_b_id" uuid NOT NULL,
	"lap_a" integer NOT NULL,
	"lap_b" integer NOT NULL,
	"summary_json" jsonb,
	"visibility" text DEFAULT 'public' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comparisons_slug_unique" UNIQUE("slug"),
	CONSTRAINT "comparisons_drivers_differ" CHECK ("comparisons"."driver_a_id" <> "comparisons"."driver_b_id")
);
--> statement-breakpoint
CREATE TABLE "drivers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_key" text NOT NULL,
	"abbreviation" text NOT NULL,
	"display_name" text NOT NULL,
	"nationality" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "drivers_external_key_unique" UNIQUE("external_key")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"external_key" text NOT NULL,
	"name" text NOT NULL,
	"circuit_name" text,
	"country_code" text,
	"start_at" timestamp with time zone,
	"status" text DEFAULT 'completed' NOT NULL,
	CONSTRAINT "events_season_key_uq" UNIQUE("season_id","external_key")
);
--> statement-breakpoint
CREATE TABLE "laps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"driver_id" uuid NOT NULL,
	"lap_number" integer NOT NULL,
	"lap_time_ms" integer,
	"sector_1_ms" integer,
	"sector_2_ms" integer,
	"sector_3_ms" integer,
	"compound" text,
	"tyre_life" numeric,
	"is_valid" boolean,
	"source_status" text,
	CONSTRAINT "laps_session_driver_lap_uq" UNIQUE("session_id","driver_id","lap_number"),
	CONSTRAINT "laps_number_positive" CHECK ("laps"."lap_number" > 0)
);
--> statement-breakpoint
CREATE TABLE "processing_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"status" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"error_code" text,
	"log_summary" text,
	"input_hash" text
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year" integer NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seasons_year_unique" UNIQUE("year")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"external_key" text NOT NULL,
	"session_type" text NOT NULL,
	"name" text NOT NULL,
	"started_at" timestamp with time zone,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"processed_at" timestamp with time zone,
	"artifact_version" integer,
	"source_name" text DEFAULT 'unknown' NOT NULL,
	"rights_status" text DEFAULT 'unverified' NOT NULL,
	CONSTRAINT "sessions_event_key_uq" UNIQUE("event_id","external_key")
);
--> statement-breakpoint
CREATE TABLE "share_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comparison_id" uuid NOT NULL,
	"asset_uri" text NOT NULL,
	"asset_type" text NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "telemetry_artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"driver_id" uuid NOT NULL,
	"lap_number" integer NOT NULL,
	"artifact_uri" text NOT NULL,
	"format_version" integer NOT NULL,
	"calculation_version" text NOT NULL,
	"source_key" text NOT NULL,
	"processed_at" timestamp with time zone NOT NULL,
	"metadata_json" jsonb,
	CONSTRAINT "telemetry_artifacts_uq" UNIQUE("session_id","driver_id","lap_number","format_version","calculation_version")
);
--> statement-breakpoint
ALTER TABLE "comparisons" ADD CONSTRAINT "comparisons_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comparisons" ADD CONSTRAINT "comparisons_driver_a_id_drivers_id_fk" FOREIGN KEY ("driver_a_id") REFERENCES "public"."drivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comparisons" ADD CONSTRAINT "comparisons_driver_b_id_drivers_id_fk" FOREIGN KEY ("driver_b_id") REFERENCES "public"."drivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "laps" ADD CONSTRAINT "laps_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "laps" ADD CONSTRAINT "laps_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processing_jobs" ADD CONSTRAINT "processing_jobs_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_assets" ADD CONSTRAINT "share_assets_comparison_id_comparisons_id_fk" FOREIGN KEY ("comparison_id") REFERENCES "public"."comparisons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telemetry_artifacts" ADD CONSTRAINT "telemetry_artifacts_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telemetry_artifacts" ADD CONSTRAINT "telemetry_artifacts_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_season_start_idx" ON "events" USING btree ("season_id","start_at");--> statement-breakpoint
CREATE INDEX "laps_lookup_idx" ON "laps" USING btree ("session_id","driver_id","lap_number");--> statement-breakpoint
CREATE INDEX "processing_jobs_session_status_idx" ON "processing_jobs" USING btree ("session_id","status");--> statement-breakpoint
CREATE INDEX "sessions_event_type_idx" ON "sessions" USING btree ("event_id","session_type");--> statement-breakpoint
CREATE INDEX "telemetry_artifacts_lookup_idx" ON "telemetry_artifacts" USING btree ("session_id","driver_id","lap_number");