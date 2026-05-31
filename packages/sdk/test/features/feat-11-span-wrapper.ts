// FEATURE: span() wraps a function so each call produces a span; arguments and
// return values pass through, and the spans nest under the active trace.
import * as logsneat from 'logsneat';

await logsneat.init({ apiKey: process.env.API_KEY, workflowName: 'feat-span-wrapper', instrumentations: [] });

const getWeather = logsneat.span(
  { kind: 'TOOL', name: 'get_weather', attributes: { provider: 'open-meteo' } },
  async (city: string) => `sunny in ${city}`,
);

await logsneat.trace('weather_flow', { kind: 'WORKFLOW' }, async () => {
  const a = await getWeather('Paris');
  const b = await getWeather('Tokyo');
  console.log('returns:', a, '|', b); // two TOOL spans, two return values
});

await logsneat.flush();
await logsneat.shutdown();
