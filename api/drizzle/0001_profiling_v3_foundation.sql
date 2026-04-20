CREATE TABLE "profiling_job_description_v3" (
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
CREATE TABLE "profiling_session_v3" (
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
CREATE TABLE "profiling_session_file_v3" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"file_id" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidate_result_v3" (
	"id" uuid PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"file_id" bigint NOT NULL,
	"run_id" uuid NOT NULL,
	"candidate_name" varchar(255),
	"candidate_email" varchar(320),
	"candidate_phone" varchar(32),
	"raw_text" text NOT NULL,
	"resume_artifact" jsonb,
	"candidate_dna" jsonb NOT NULL,
	"score_artifact" jsonb NOT NULL,
	"overall_score" numeric(5, 2) NOT NULL,
	"base_score" numeric(5, 2) NOT NULL,
	"bonus_score" numeric(5, 2) NOT NULL,
	"summary" text NOT NULL,
	"skills_matched" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiling_job_description_v3" ADD CONSTRAINT "profiling_job_description_v3_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiling_session_v3" ADD CONSTRAINT "profiling_session_v3_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiling_session_v3" ADD CONSTRAINT "profiling_session_v3_job_description_id_profiling_job_description_v3_id_fk" FOREIGN KEY ("job_description_id") REFERENCES "public"."profiling_job_description_v3"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiling_session_file_v3" ADD CONSTRAINT "profiling_session_file_v3_session_id_profiling_session_v3_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."profiling_session_v3"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiling_session_file_v3" ADD CONSTRAINT "profiling_session_file_v3_file_id_resume_file_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."resume_file"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_result_v3" ADD CONSTRAINT "candidate_result_v3_session_id_profiling_session_v3_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."profiling_session_v3"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_result_v3" ADD CONSTRAINT "candidate_result_v3_file_id_resume_file_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."resume_file"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "profiling_job_description_v3_user_id_index" ON "profiling_job_description_v3" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "profiling_job_description_v3_last_used_at_index" ON "profiling_job_description_v3" USING btree ("last_used_at");--> statement-breakpoint
CREATE INDEX "profiling_session_v3_user_id_index" ON "profiling_session_v3" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "profiling_session_v3_job_description_id_index" ON "profiling_session_v3" USING btree ("job_description_id");--> statement-breakpoint
CREATE INDEX "profiling_session_v3_status_index" ON "profiling_session_v3" USING btree ("status");--> statement-breakpoint
CREATE INDEX "profiling_session_file_v3_session_id_index" ON "profiling_session_file_v3" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "profiling_session_file_v3_file_id_index" ON "profiling_session_file_v3" USING btree ("file_id");--> statement-breakpoint
CREATE UNIQUE INDEX "profiling_session_file_v3_session_file_unique" ON "profiling_session_file_v3" USING btree ("session_id","file_id");--> statement-breakpoint
CREATE INDEX "candidate_result_v3_session_id_run_id_index" ON "candidate_result_v3" USING btree ("session_id","run_id");--> statement-breakpoint
CREATE UNIQUE INDEX "candidate_result_v3_run_file_unique" ON "candidate_result_v3" USING btree ("run_id","file_id");
