CREATE UNIQUE INDEX "spans_span_unique" ON "spans" USING btree ("trace_id","span_id");--> statement-breakpoint
CREATE INDEX "spans_trace_idx" ON "spans" USING btree ("trace_id");--> statement-breakpoint
CREATE INDEX "spans_workflow_start_idx" ON "spans" USING btree ("workflow_name","start_time");--> statement-breakpoint
CREATE INDEX "spans_session_idx" ON "spans" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "traces_trace_unique" ON "traces" USING btree ("trace_id");--> statement-breakpoint
CREATE INDEX "traces_workflow_start_idx" ON "traces" USING btree ("workflow_name","start_time");--> statement-breakpoint
CREATE INDEX "traces_session_idx" ON "traces" USING btree ("session_id");