/**
 * Expo push delivery.
 *
 * Handles the two things the Expo push API requires and that are easy to get
 * wrong: batching (100 messages per request) and acting on the per-message
 * receipts, particularly `DeviceNotRegistered`, which must invalidate the token
 * rather than being retried forever.
 */
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/** The API's documented maximum per request. */
const BATCH_SIZE = 100;

export interface PushMessage {
  to: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  channelId?: string;
  sound?: 'default' | null;
}

export interface PushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

export interface PushResult {
  sent: number;
  failed: number;
  /** Tokens Expo reports as no longer valid; these should be invalidated. */
  unregisteredTokens: string[];
}

export async function sendPushMessages(messages: PushMessage[]): Promise<PushResult> {
  const result: PushResult = { sent: 0, failed: 0, unregisteredTokens: [] };
  if (messages.length === 0) return result;

  const accessToken = Deno.env.get('EXPO_ACCESS_TOKEN');

  for (let offset = 0; offset < messages.length; offset += BATCH_SIZE) {
    const batch = messages.slice(offset, offset + BATCH_SIZE);

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(batch),
    });

    if (!response.ok) {
      result.failed += batch.length;
      console.error('expo push batch failed', response.status);
      continue;
    }

    const payload = (await response.json()) as { data?: PushTicket[] };
    const tickets = payload.data ?? [];

    tickets.forEach((ticket, index) => {
      if (ticket.status === 'ok') {
        result.sent += 1;
        return;
      }

      result.failed += 1;

      // The app was uninstalled or the token was rotated; retrying this token
      // will never succeed.
      if (ticket.details?.error === 'DeviceNotRegistered') {
        const token = batch[index]?.to;
        if (token) result.unregisteredTokens.push(token);
      }
    });
  }

  return result;
}
