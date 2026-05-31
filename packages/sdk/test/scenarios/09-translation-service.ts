// Scenario 9 — Translation service. Reuses userId `alice_chen` (a second session
// for her) so the User Stories screen shows one user with multiple sessions.
import * as logsneat from 'logsneat';
import OpenAI from 'openai';

await logsneat.init({
  apiKey: process.env.API_KEY,
  workflowName: 'translator',
  userId: 'alice_chen',
  tags: ['translation'],
  autoSession: true,
});
const client = new OpenAI();

const detectLanguage = logsneat.span({ kind: 'TOOL', name: 'detect_language', attributes: { detected: 'en' } }, async () => 'en');

await logsneat.trace('translate', { kind: 'WORKFLOW', attributes: { target: 'fr' } }, async () => {
  await detectLanguage();
  const res = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: 'Translate to French: "Good morning, how are you?"' }],
  });
  console.log('translation:', res.choices[0]?.message.content);
});

await logsneat.flush();
await logsneat.shutdown();
