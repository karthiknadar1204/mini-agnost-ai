// Example app using the logsneat SDK. Run with API_KEY + OPENAI_API_KEY set.
import * as logsneat from './src/index';
import * as openai from 'openai';

await logsneat.init({
  apiKey: process.env.API_KEY,
  workflowName: 'sdk-demo',
  instrumentations: ['openai'],
});

const client = new openai.OpenAI();
const res = await client.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'What is the capital of France?' }],
});
console.log(res.choices[0]?.message.content);

await logsneat.flush();
await logsneat.shutdown();
