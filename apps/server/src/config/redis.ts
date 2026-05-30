import type { ConnectionOptions } from 'bullmq';
import * as dotenv from 'dotenv';

dotenv.config();

// Shared options for BullMQ (queue + worker). maxRetriesPerRequest must be
// null for BullMQ to use blocking commands.
export const connection: ConnectionOptions = {
  url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  maxRetriesPerRequest: null,
};
