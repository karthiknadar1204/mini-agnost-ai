import { relations } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  smallint,
  numeric,
  jsonb,
  doublePrecision,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ─── Auth ─────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(), // hashed
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Tenancy ──────────────────────────────────────────────────────────────

export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Ingest auth. The bearer token is hashed (sha256) on ingest and looked up by hash.
export const apiKeys = pgTable('api_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  keyHash: text('key_hash').notNull().unique(),
  prefix: text('prefix').notNull(), // first chars, for display only
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Spans (one row per OTLP span) ──────────────────────────────────────────

export const spans = pgTable(
  'spans',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),

    // identity / tree
    traceId: text('trace_id').notNull(),
    spanId: text('span_id').notNull(),
    parentSpanId: text('parent_span_id'),

    name: text('name').notNull(),
    kind: text('kind'), // logsneat kind: WORKFLOW | AGENT | LLM | TOOL | ... (normalized)
    scopeName: text('scope_name'), // which instrumentation emitted it

    // timing
    startTime: timestamp('start_time', { withTimezone: true }).notNull(),
    endTime: timestamp('end_time', { withTimezone: true }).notNull(),
    durationMs: doublePrecision('duration_ms').notNull(),

    // status: 0 unset, 1 ok, 2 error
    statusCode: smallint('status_code').notNull().default(0),
    statusMessage: text('status_message'),

    // resource-level identity (from the producer)
    workflowName: text('workflow_name'),
    sessionId: text('session_id'),
    userId: text('user_id'),
    tags: jsonb('tags').$type<string[]>(),

    // hot LLM fields pulled out for querying / rollups (null on non-LLM spans)
    model: text('model'),
    promptTokens: integer('prompt_tokens'),
    completionTokens: integer('completion_tokens'),
    totalTokens: integer('total_tokens'),
    costUsd: numeric('cost_usd', { precision: 12, scale: 6 }),

    // everything else, normalized to the logsneat.* namespace
    attributes: jsonb('attributes').$type<Record<string, unknown>>().notNull().default({}),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('spans_span_unique').on(t.traceId, t.spanId),
    index('spans_trace_idx').on(t.traceId),
    index('spans_workflow_start_idx').on(t.workflowName, t.startTime),
    index('spans_session_idx').on(t.sessionId),
  ],
);

// ─── Traces (materialized summary, one row per trace) ───────────────────────

export const traces = pgTable(
  'traces',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),

    traceId: text('trace_id').notNull(),
    workflowName: text('workflow_name'),
    rootSpanName: text('root_span_name'),

    sessionId: text('session_id'),
    userId: text('user_id'),
    tags: jsonb('tags').$type<string[]>(),

    startTime: timestamp('start_time', { withTimezone: true }).notNull(),
    endTime: timestamp('end_time', { withTimezone: true }).notNull(),
    durationMs: doublePrecision('duration_ms').notNull(),

    spanCount: integer('span_count').notNull().default(0),
    totalTokens: integer('total_tokens').notNull().default(0),
    totalCostUsd: numeric('total_cost_usd', { precision: 12, scale: 6 }).notNull().default('0'),
    status: text('status').notNull().default('ok'), // ok | error

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('traces_trace_unique').on(t.traceId),
    index('traces_workflow_start_idx').on(t.workflowName, t.startTime),
    index('traces_session_idx').on(t.sessionId),
  ],
);

// ─── Detections (one row per rule match on a trace) ─────────────────────────

export const detections = pgTable(
  'detections',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),

    traceId: text('trace_id').notNull(),
    spanId: text('span_id'), // null = trace-level detection

    rule: text('rule').notNull(), // rule id, e.g. high_latency | tool_error
    severity: text('severity').notNull(), // low | medium | high
    title: text('title').notNull(),
    details: jsonb('details').$type<Record<string, unknown>>().notNull().default({}),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('detections_project_created_idx').on(t.projectId, t.createdAt),
    index('detections_trace_idx').on(t.traceId),
    index('detections_severity_idx').on(t.severity),
  ],
);

// ─── Relations ──────────────────────────────────────────────────────────────

export const projectsRelations = relations(projects, ({ many }) => ({
  apiKeys: many(apiKeys),
  spans: many(spans),
  traces: many(traces),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  project: one(projects, { fields: [apiKeys.projectId], references: [projects.id] }),
}));

export const spansRelations = relations(spans, ({ one }) => ({
  project: one(projects, { fields: [spans.projectId], references: [projects.id] }),
}));

export const tracesRelations = relations(traces, ({ one }) => ({
  project: one(projects, { fields: [traces.projectId], references: [projects.id] }),
}));

export const detectionsRelations = relations(detections, ({ one }) => ({
  project: one(projects, { fields: [detections.projectId], references: [projects.id] }),
}));
