// Scenario 3 — Multi-turn chatbot. One explicit session, several sequential
// turns → populates the User Stories chat reconstruction with a real back-and-forth.
import * as logsneat from 'logsneat';
import OpenAI from 'openai';

await logsneat.init({
  apiKey: process.env.API_KEY,
  workflowName: 'chatbot',
  userId: 'carol_diaz',
  sessionId: 'sess-carol-travel',
  tags: ['chat'],
});
const client = new OpenAI();

const turns = [
  'Hi! I want to plan a trip to Japan.',
  'What are the best months to visit?',
  'How many days do you recommend for a first trip?',
];

for (const [i, q] of turns.entries()) {
  await logsneat.trace('chat_turn', { kind: 'WORKFLOW', attributes: { 'turn.index': i + 1 } }, async () => {
    const res = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: q + ' Answer in one short sentence.' }],
    });
    console.log(`turn ${i + 1}:`, res.choices[0]?.message.content);
  });
}

await logsneat.flush();
await logsneat.shutdown();
