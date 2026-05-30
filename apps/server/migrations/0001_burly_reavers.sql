DROP INDEX "spans_project_span_unique";--> statement-breakpoint
DROP INDEX "spans_trace_idx";--> statement-breakpoint
DROP INDEX "spans_workflow_start_idx";--> statement-breakpoint
DROP INDEX "spans_session_idx";--> statement-breakpoint
DROP INDEX "traces_project_trace_unique";--> statement-breakpoint
DROP INDEX "traces_workflow_start_idx";--> statement-breakpoint
DROP INDEX "traces_session_idx";--> statement-breakpoint
ALTER TABLE "spans" ALTER COLUMN "project_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "traces" ALTER COLUMN "project_id" DROP NOT NULL;