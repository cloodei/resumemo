CREATE TABLE "job_description_template" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"job_title" varchar(255),
	"raw_text" text NOT NULL,
	"content_hash" varchar(64) NOT NULL,
	"use_count" bigint DEFAULT 0 NOT NULL,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_description_template" ADD CONSTRAINT "job_description_template_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "job_description_template_user_id_index" ON "job_description_template" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "job_description_template_last_used_at_index" ON "job_description_template" USING btree ("last_used_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "job_description_template_user_content_hash_unique" ON "job_description_template" USING btree ("user_id","content_hash");
--> statement-breakpoint
WITH normalized AS (
	SELECT
		"user_id",
		btrim(regexp_replace(replace("job_description", E'\r\n', E'\n'), E'[ \t]+\n', E'\n', 'g'), E' \t\n\r') AS "raw_text",
		"job_title",
		"name",
		"created_at",
		"updated_at"
	FROM "profiling_session"
),
grouped AS (
	SELECT
		"user_id",
		md5("raw_text") AS "content_hash",
		min("raw_text") AS "raw_text",
		min(coalesce(nullif("job_title", ''), nullif("name", ''), 'Untitled role brief')) AS "name",
		min(nullif("job_title", '')) AS "job_title",
		count(*) AS "use_count",
		min("created_at") AS "created_at",
		max("updated_at") AS "updated_at",
		max("created_at") AS "last_used_at"
	FROM normalized
	GROUP BY "user_id", md5("raw_text")
)
INSERT INTO "job_description_template" (
	"id",
	"user_id",
	"name",
	"job_title",
	"raw_text",
	"content_hash",
	"use_count",
	"last_used_at",
	"created_at",
	"updated_at"
)
SELECT
	(
		substr(md5("user_id"::text || ':' || "content_hash"), 1, 8) || '-' ||
		substr(md5("user_id"::text || ':' || "content_hash"), 9, 4) || '-' ||
		substr(md5("user_id"::text || ':' || "content_hash"), 13, 4) || '-' ||
		substr(md5("user_id"::text || ':' || "content_hash"), 17, 4) || '-' ||
		substr(md5("user_id"::text || ':' || "content_hash"), 21, 12)
	)::uuid,
	"user_id",
	left("name", 255),
	"job_title",
	"raw_text",
	"content_hash",
	"use_count",
	"last_used_at",
	"created_at",
	"updated_at"
FROM grouped;
--> statement-breakpoint
ALTER TABLE "profiling_session" ADD COLUMN "job_description_template_id" uuid;
--> statement-breakpoint
UPDATE "profiling_session"
SET "job_description_template_id" = "job_description_template"."id"
FROM "job_description_template"
WHERE
	"profiling_session"."user_id" = "job_description_template"."user_id"
	AND md5(btrim(regexp_replace(replace("profiling_session"."job_description", E'\r\n', E'\n'), E'[ \t]+\n', E'\n', 'g'), E' \t\n\r')) = "job_description_template"."content_hash";
--> statement-breakpoint
ALTER TABLE "profiling_session" ALTER COLUMN "job_description_template_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "profiling_session" ADD CONSTRAINT "profiling_session_job_description_template_id_job_description_template_id_fk" FOREIGN KEY ("job_description_template_id") REFERENCES "public"."job_description_template"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "profiling_session_job_description_template_id_index" ON "profiling_session" USING btree ("job_description_template_id");
--> statement-breakpoint
ALTER TABLE "profiling_session" DROP COLUMN "job_description";
--> statement-breakpoint
DROP SCHEMA IF EXISTS "screening" CASCADE;
