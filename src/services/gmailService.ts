import { getAccessToken } from './googleAuth';

export interface GmailMessageHeader {
  name: string;
  value: string;
}

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  labelIds: string[];
  isUnread: boolean;
}

export interface GmailMessageDetail extends GmailMessageSummary {
  bodyHtml: string;
  bodyText: string;
}

export interface GmailUserProfile {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
  historyId: string;
}

export interface SendEmailPayload {
  to: string;
  subject: string;
  body: string;
  cc?: string;
  isHtml?: boolean;
}

// Convert a string to URL-safe Base64 as required by the Gmail API
function base64UrlEncode(str: string): string {
  // UTF-8 safe encoding
  const utf8Bytes = new TextEncoder().encode(str);
  let binary = '';
  utf8Bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function fetchUserProfile(): Promise<GmailUserProfile> {
  const token = await getAccessToken();
  if (!token) throw new Error('Non authentifié avec Google / Gmail');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Erreur profil Gmail (${res.status})`);
  }

  return res.json();
}

export async function listGmailMessages(
  query: string = '',
  maxResults: number = 20
): Promise<GmailMessageSummary[]> {
  const token = await getAccessToken();
  if (!token) throw new Error('Non authentifié avec Google / Gmail');

  const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
  url.searchParams.set('maxResults', maxResults.toString());
  if (query) {
    url.searchParams.set('q', query);
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Erreur chargement messages (${res.status})`);
  }

  const data = await res.json();
  const messagesList = data.messages || [];

  if (messagesList.length === 0) return [];

  // Fetch summaries in parallel (batched for performance)
  const summaries = await Promise.all(
    messagesList.slice(0, 15).map(async (msg: { id: string; threadId: string }) => {
      try {
        const detailRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!detailRes.ok) return null;
        const msgData = await detailRes.json();
        const headers: GmailMessageHeader[] = msgData.payload?.headers || [];

        const getH = (name: string) =>
          headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

        return {
          id: msgData.id,
          threadId: msgData.threadId,
          snippet: msgData.snippet || '',
          subject: getH('Subject') || '(Sans objet)',
          from: getH('From'),
          to: getH('To'),
          date: getH('Date'),
          labelIds: msgData.labelIds || [],
          isUnread: (msgData.labelIds || []).includes('UNREAD'),
        } as GmailMessageSummary;
      } catch {
        return null;
      }
    })
  );

  return summaries.filter((s): s is GmailMessageSummary => s !== null);
}

export async function getGmailMessageDetail(id: string): Promise<GmailMessageDetail> {
  const token = await getAccessToken();
  if (!token) throw new Error('Non authentifié avec Google / Gmail');

  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Impossible de lire le message (${res.status})`);
  }

  const msgData = await res.json();
  const headers: GmailMessageHeader[] = msgData.payload?.headers || [];
  const getH = (name: string) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

  let bodyHtml = '';
  let bodyText = '';

  const parseParts = (parts: any[]) => {
    for (const part of parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        bodyText += decodeBase64(part.body.data);
      } else if (part.mimeType === 'text/html' && part.body?.data) {
        bodyHtml += decodeBase64(part.body.data);
      } else if (part.parts) {
        parseParts(part.parts);
      }
    }
  };

  if (msgData.payload?.body?.data) {
    if (msgData.payload.mimeType === 'text/html') {
      bodyHtml = decodeBase64(msgData.payload.body.data);
    } else {
      bodyText = decodeBase64(msgData.payload.body.data);
    }
  } else if (msgData.payload?.parts) {
    parseParts(msgData.payload.parts);
  }

  return {
    id: msgData.id,
    threadId: msgData.threadId,
    snippet: msgData.snippet || '',
    subject: getH('Subject') || '(Sans objet)',
    from: getH('From'),
    to: getH('To'),
    date: getH('Date'),
    labelIds: msgData.labelIds || [],
    isUnread: (msgData.labelIds || []).includes('UNREAD'),
    bodyHtml: bodyHtml || `<pre>${bodyText}</pre>`,
    bodyText: bodyText || msgData.snippet || '',
  };
}

function decodeBase64(base64Str: string): string {
  try {
    const base64 = base64Str.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch (e) {
    return base64Str;
  }
}

export async function sendGmailEmail(payload: SendEmailPayload): Promise<{ id: string; threadId: string }> {
  const token = await getAccessToken();
  if (!token) throw new Error('Non authentifié avec Google / Gmail');

  const lines = [
    `To: ${payload.to}`,
    ...(payload.cc ? [`Cc: ${payload.cc}`] : []),
    `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(payload.subject)))}?=`,
    'MIME-Version: 1.0',
    `Content-Type: ${payload.isHtml ? 'text/html' : 'text/plain'}; charset=utf-8`,
    '',
    payload.body,
  ];

  const emailRaw = lines.join('\r\n');
  const encodedEmail = base64UrlEncode(emailRaw);

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encodedEmail }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Échec de l'envoi de l'e-mail (${res.status})`);
  }

  return res.json();
}

export async function deleteGmailMessage(messageId: string): Promise<void> {
  const token = await getAccessToken();
  if (!token) throw new Error('Non authentifié avec Google / Gmail');

  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Échec de la suppression (${res.status})`);
  }
}
