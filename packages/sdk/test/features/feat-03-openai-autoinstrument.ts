// FEATURE: OpenAI auto-instrumentation. A chat call inside a trace becomes an
// LLM span with model, token counts and cost — no extra code.
import * as logsneat from 'logsneat';
import OpenAI from 'openai';

await logsneat.init({ apiKey: process.env.API_KEY, workflowName: 'feat-openai', instrumentations: ['openai'] });
const openai = new OpenAI();

await logsneat.trace('ask', { kind: 'WORKFLOW' }, async () => {
  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: 'Say hi in exactly three words.' }],
  });
  console.log('llm:', res.choices[0]?.message.content);
});

await logsneat.flush();
await logsneat.shutdown();
