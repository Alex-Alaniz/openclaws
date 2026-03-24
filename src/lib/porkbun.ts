import * as Sentry from '@sentry/nextjs';

const PORKBUN_API_BASE = 'https://api.porkbun.com/api/json/v3';
const DOMAIN = 'openclaws.biz';

function getKeys(): { apikey: string; secretapikey: string } {
  const apikey = process.env.PORKBUN_API_KEY?.trim();
  const secretapikey = process.env.PORKBUN_SECRET_KEY?.trim();
  if (!apikey || !secretapikey) throw new Error('PORKBUN_API_KEY or PORKBUN_SECRET_KEY not configured');
  return { apikey, secretapikey };
}

type PorkbunResponse = { status: string; id?: number };

/**
 * Porkbun error messages that are expected operational outcomes, not bugs.
 * These arise from idempotent create/delete operations and race conditions.
 */
const EXPECTED_PORKBUN_ERRORS = [
  'Could not delete record',       // Record doesn't exist (idempotent delete)
  'unable to create the DNS record', // Duplicate record (idempotent create)
];

async function porkbunFetch(path: string, body: Record<string, string>): Promise<PorkbunResponse> {
  const res = await fetch(`${PORKBUN_API_BASE}${path}`, {
    method: 'POST',
    signal: AbortSignal.timeout(15_000),
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...getKeys(), ...body }),
  });

  const data = (await res.json()) as PorkbunResponse;
  if (data.status !== 'SUCCESS') {
    const err = new Error(`Porkbun API error on ${path}: ${JSON.stringify(data)}`);
    // Only report to Sentry if this is NOT a known operational error
    const message = JSON.stringify(data).toLowerCase();
    const isExpected = EXPECTED_PORKBUN_ERRORS.some(e => message.includes(e.toLowerCase()));
    if (!isExpected) {
      Sentry.captureException(err);
    }
    throw err;
  }
  return data;
}

/** Create a CNAME record for {subdomain}.openclaws.biz → target. Idempotent — deletes existing first. */
export async function createSubdomainCname(subdomain: string, target: string): Promise<void> {
  // Delete any existing CNAME for this subdomain (idempotent)
  await deleteSubdomainCname(subdomain);

  await porkbunFetch(`/dns/create/${DOMAIN}`, {
    name: subdomain,
    type: 'CNAME',
    content: target,
    ttl: '600',
  });
}

/** Delete a DNS record by ID */
export async function deleteDnsRecord(recordId: number): Promise<void> {
  await porkbunFetch(`/dns/delete/${DOMAIN}/${recordId}`, {});
}

/** Delete a CNAME record by subdomain name */
export async function deleteSubdomainCname(subdomain: string): Promise<void> {
  try {
    await porkbunFetch(`/dns/deleteByNameType/${DOMAIN}/CNAME/${subdomain}`, {});
  } catch {
    // Record may not exist — non-fatal
  }
}
