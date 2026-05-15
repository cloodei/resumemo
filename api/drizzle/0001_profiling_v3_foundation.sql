CREATE SCHEMA IF NOT EXISTS "screening";
--> statement-breakpoint
CREATE TABLE "screening"."job_description" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"job_title" varchar(255),
	"raw_text" text NOT NULL,
	"source" varchar(32) DEFAULT 'inline' NOT NULL,
	"latest_artifact" jsonb,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "screening"."session" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"job_description_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"job_title_snapshot" varchar(255),
	"status" varchar(32) DEFAULT 'processing' NOT NULL,
	"total_files" bigint DEFAULT 0 NOT NULL,
	"active_run_id" uuid,
	"error_message" text,
	"job_description_artifact" jsonb,
	"last_completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "screening"."session_file" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"file_id" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "screening"."candidate" (
	"id" uuid PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"file_id" bigint NOT NULL,
	"run_id" uuid NOT NULL,
	"candidate_name" varchar(255),
	"candidate_email" varchar(320),
	"candidate_phone" varchar(32),
	"raw_text" text NOT NULL,
	"resume_artifact" jsonb,
	"candidate_profile" jsonb NOT NULL,
	"score_artifact" jsonb NOT NULL,
	"overall_score" numeric(5, 2) NOT NULL,
	"base_score" numeric(5, 2) NOT NULL,
	"bonus_score" numeric(5, 2) NOT NULL,
	"summary" text NOT NULL,
	"skills_matched" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "screening"."job_description" ADD CONSTRAINT "screening_job_description_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "screening"."session" ADD CONSTRAINT "screening_session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "screening"."session" ADD CONSTRAINT "screening_session_job_description_id_job_description_id_fk" FOREIGN KEY ("job_description_id") REFERENCES "screening"."job_description"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "screening"."session_file" ADD CONSTRAINT "screening_session_file_session_id_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "screening"."session"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "screening"."session_file" ADD CONSTRAINT "screening_session_file_file_id_resume_file_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."resume_file"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "screening"."candidate" ADD CONSTRAINT "screening_candidate_session_id_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "screening"."session"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "screening"."candidate" ADD CONSTRAINT "screening_candidate_file_id_resume_file_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."resume_file"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "screening_job_description_user_id_index" ON "screening"."job_description" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "screening_job_description_last_used_at_index" ON "screening"."job_description" USING btree ("last_used_at");
--> statement-breakpoint
CREATE INDEX "screening_session_user_id_index" ON "screening"."session" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "screening_session_job_description_id_index" ON "screening"."session" USING btree ("job_description_id");
--> statement-breakpoint
CREATE INDEX "screening_session_status_index" ON "screening"."session" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "screening_session_file_session_id_index" ON "screening"."session_file" USING btree ("session_id");
--> statement-breakpoint
CREATE INDEX "screening_session_file_file_id_index" ON "screening"."session_file" USING btree ("file_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "screening_session_file_session_file_unique" ON "screening"."session_file" USING btree ("session_id","file_id");
--> statement-breakpoint
CREATE INDEX "screening_candidate_session_id_run_id_index" ON "screening"."candidate" USING btree ("session_id","run_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "screening_candidate_run_file_unique" ON "screening"."candidate" USING btree ("run_id","file_id");
