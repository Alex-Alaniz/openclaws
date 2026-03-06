/**
 * Receives Sentry issue webhooks, verifies the HMAC signature, and creates a
 * Linear issue for actionable OpenClaws errors.
 */
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const CONFIG = {
  linearApiUrl: 'https://api.linear.app/graphql',
  teamId: process.env.LINEAR_TEAM_ID || '199361fb-b484-4f6b-8bea-4ab36b87e487',
  projectId: process.env.LINEAR_PROJECT_ID || 'a51294d2-be99-48b3-9521-75e4a9a595b0',
  labelIds: (process.env.LINEAR_LABEL_IDS || '98504c1e-842a-4ec0-8dd4-5cde30b7e5ad,85a64b82-55a5-4a5c-bab6-04da403a582f,67fdc60f-bfef-42e4-b655-61f87d197ccf')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
  sentryOrg: process.env.SENTRY_ORG || 'earo',
} as const;

const CREATE_ISSUE_ACTIONS = new Set(['created']);
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Sentry issue details used by the Linear integration and future package extraction.
 */
export interface SentryIssue {
  id: string;
  title: string;
  culprit: string;
  shortId: string;
  firstSeen: string;
  lastSeen: string;
  count: number;
  level: string;
  platform: string;
  project?: {
    name?: string;
    slug?: string;
  };
  metadata?: {
    type?: string;
    value?: string;
    filename?: string;
    function?: string;
  };
}

/**
 * Minimal Sentry webhook payload shape for issue notifications.
 */
export interface SentryWebhookPayload {
  action: string;
  data?: {
    issue?: SentryIssue;
  };
  installation?: {
    uuid: string;
  };
}

interface LinearIssue {
  id: string;
  identifier: string;
  url: string;
}

interface LinearResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

/**
 * Handles Sentry issue webhooks and creates a linked Linear bug for new issues.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const linearApiKey = process.env.LINEAR_API_KEY?.trim();
  const sentrySecret = process.env.SENTRY_WEBHOOK_SECRET?.trim();

  if (!linearApiKey || !sentrySecret) {
    return NextResponse.json({ error: 'Missing Sentry webhook configuration' }, { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get('sentry-hook-signature');

  if (!(await verifySentrySignature(body, signature, sentrySecret))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: SentryWebhookPayload;
  try {
    payload = JSON.parse(body) as SentryWebhookPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const issue = payload.data?.issue;
  if (!issue) {
    return NextResponse.json({ message: 'Not an issue event' }, { status: 200 });
  }

  if (!CREATE_ISSUE_ACTIONS.has(payload.action)) {
    return NextResponse.json({ message: `Ignored action: ${payload.action}` }, { status: 200 });
  }

  try {
    const linearIssue = await createLinearIssue(issue, linearApiKey);
    return NextResponse.json({ success: true, linearIssue }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create Linear issue';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

/**
 * Creates a Linear issue for a Sentry error using the configured team, project, and labels.
 */
async function createLinearIssue(issue: SentryIssue, linearApiKey: string): Promise<LinearIssue> {
  const query = `
    mutation CreateIssue($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue {
          id
          identifier
          url
        }
      }
    }
  `;

  const response = await fetch(CONFIG.linearApiUrl, {
    method: 'POST',
    headers: {
      Authorization: linearApiKey,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    body: JSON.stringify({
      query,
      variables: {
        input: {
          teamId: CONFIG.teamId,
          projectId: CONFIG.projectId,
          labelIds: CONFIG.labelIds,
          title: `[Sentry] ${issue.title}`,
          description: formatLinearDescription(issue),
          priority: getLinearPriority(issue.count),
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Linear API request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as LinearResponse<{
    issueCreate?: { success?: boolean; issue?: LinearIssue | null };
  }>;

  if (data.errors?.length) {
    throw new Error(data.errors.map((entry) => entry.message).join('; '));
  }

  const createdIssue = data.data?.issueCreate?.issue;
  if (!data.data?.issueCreate?.success || !createdIssue) {
    throw new Error('Linear issue creation did not return an issue');
  }

  return createdIssue;
}

/**
 * Verifies the Sentry webhook signature with Web Crypto HMAC-SHA256.
 */
async function verifySentrySignature(body: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature) return false;

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    const expectedSignature = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
    return constantTimeEqual(signature, expectedSignature);
  } catch {
    return false;
  }
}

/**
 * Compares two strings in constant time to reduce timing side channels.
 */
function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  const encoder = new TextEncoder();
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  let diff = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    diff |= leftBytes[index] ^ rightBytes[index];
  }
  return diff === 0;
}

function formatLinearDescription(issue: SentryIssue): string {
  const sentryLink = `https://${CONFIG.sentryOrg}.sentry.io/issues/${issue.shortId}/`;
  const sections = [
    '## Sentry Error Details',
    '',
    `**Sentry Issue:** ${sentryLink}`,
    `**Error Type:** ${issue.metadata?.type || issue.level || 'unknown'}`,
    `**Culprit:** ${issue.culprit || 'Unknown'}`,
    `**Platform:** ${issue.platform || 'Unknown'}`,
    `**Project:** ${issue.project?.name || 'Unknown'}`,
    `**First Seen:** ${issue.firstSeen}`,
    `**Last Seen:** ${issue.lastSeen}`,
    `**Event Count:** ${issue.count}`,
  ];

  if (issue.metadata?.value) {
    sections.push('', `**Error Message:**\n\`\`\`\n${issue.metadata.value}\n\`\`\``);
  }
  if (issue.metadata?.filename) sections.push(`**File:** ${issue.metadata.filename}`);
  if (issue.metadata?.function) sections.push(`**Function:** ${issue.metadata.function}`);
  sections.push('', '---', '*Auto-generated from Sentry webhook*');

  return sections.join('\n');
}

function getLinearPriority(count: number): 1 | 2 | 3 {
  if (count >= 10) return 1;
  if (count >= 5) return 2;
  return 3;
}
