export interface LogsneatConfig {
  apiKey?: string; // defaults to LOGSNEAT_API_KEY
  endpoint?: string; // defaults to LOGSNEAT_ENDPOINT or http://localhost:3004
  workflowName?: string; // label for this app, shown in the dashboard
  instrumentations?: string[]; // libraries to auto-instrument (default: ["openai"])
}
