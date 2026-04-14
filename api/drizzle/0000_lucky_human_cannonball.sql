CREATE TABLE "account" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" varchar(255) NOT NULL,
	"provider_id" varchar(50) NOT NULL,
	"access_token" varchar(2048),
	"refresh_token" varchar(2048),
	"id_token" varchar(2048),
	"scope" varchar(512),
	"password" varchar(255),
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_account_id_unique" UNIQUE("account_id")
);
--> statement-breakpoint
CREATE TABLE "candidate_result" (
	"id" uuid PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"file_id" bigint NOT NULL,
	"run_id" uuid NOT NULL,
	"candidate_name" varchar(255),
	"candidate_email" varchar(320),
	"candidate_phone" varchar(32),
	"raw_text" text NOT NULL,
	"parsed_profile" jsonb NOT NULL,
	"overall_score" numeric(5, 2) NOT NULL,
	"score_breakdown" jsonb NOT NULL,
	"summary" text NOT NULL,
	"skills_matched" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiling_session" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"job_description" text NOT NULL,
	"job_title" varchar(255),
	"status" varchar(32) DEFAULT 'processing' NOT NULL,
	"total_files" bigint DEFAULT 0 NOT NULL,
	"active_run_id" uuid,
	"error_message" text,
	"last_completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiling_session_file" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"file_id" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resume_file" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"original_name" varchar(512) NOT NULL,
	"mime_type" varchar(128) NOT NULL,
	"size" bigint NOT NULL,
	"storage_key" varchar(1024) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" varchar(512) NOT NULL,
	"ip_address" varchar(64),
	"user_agent" varchar(512),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(320) NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" uuid PRIMARY KEY NOT NULL,
	"identifier" varchar(320) NOT NULL,
	"value" varchar(1024) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_result" ADD CONSTRAINT "candidate_result_session_id_profiling_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."profiling_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_result" ADD CONSTRAINT "candidate_result_file_id_resume_file_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."resume_file"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiling_session" ADD CONSTRAINT "profiling_session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiling_session_file" ADD CONSTRAINT "profiling_session_file_session_id_profiling_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."profiling_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiling_session_file" ADD CONSTRAINT "profiling_session_file_file_id_resume_file_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."resume_file"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resume_file" ADD CONSTRAINT "resume_file_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_index" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "candidate_result_session_id_run_id_index" ON "candidate_result" USING btree ("session_id","run_id");--> statement-breakpoint
CREATE UNIQUE INDEX "candidate_result_run_file_unique" ON "candidate_result" USING btree ("run_id","file_id");--> statement-breakpoint
CREATE INDEX "profiling_session_user_id_index" ON "profiling_session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "profiling_session_status_index" ON "profiling_session" USING btree ("status");--> statement-breakpoint
CREATE INDEX "profiling_session_file_session_id_index" ON "profiling_session_file" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "profiling_session_file_file_id_index" ON "profiling_session_file" USING btree ("file_id");--> statement-breakpoint
CREATE UNIQUE INDEX "profiling_session_file_session_file_unique" ON "profiling_session_file" USING btree ("session_id","file_id");--> statement-breakpoint
CREATE INDEX "resume_file_user_id_index" ON "resume_file" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_id_index" ON "session" USING btree ("user_id");