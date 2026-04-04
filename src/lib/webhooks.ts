import { connectDB } from './db';
import { Webhook } from './models';

export async function fireWebhooks(event: string, payload: any) {
  try {
    await connectDB();
    const hooks = await Webhook.find({ enabled: true, events: event });

    await Promise.allSettled(
      hooks.map(async (hook: any) => {
        try {
          await fetch(hook.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(hook.secret ? { 'X-Webhook-Secret': hook.secret } : {}),
            },
            body: JSON.stringify({ event, payload, timestamp: new Date().toISOString() }),
          });
        } catch {}
      })
    );
  } catch {}
}
