CREATE TABLE "detections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"trace_id" text NOT NULL,
	"span_id" text,
	"rule" text NOT NULL,
	"severity" text NOT NULL,
	"title" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "detections" ADD CONSTRAINT "detections_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "detections_project_created_idx" ON "detections" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "detections_trace_idx" ON "detections" USING btree ("trace_id");--> statement-breakpoint
CREATE INDEX "detections_severity_idx" ON "detections" USING btree ("severity");