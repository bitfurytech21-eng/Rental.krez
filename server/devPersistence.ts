/**
 * Non-production Node-only persistence for dev customers, sessions, compliance docs, and steps.
 * Uses dynamic specifier construction so Cloudflare Workers / edge bundlers never fail.
 */

export interface DevAuthSnapshot {
  customers: any[];
  sessions: any[];
  complianceDocs: Record<string, any[]>;
  complianceSteps?: Record<string, any[]>;
}

const EMPTY_SNAPSHOT: DevAuthSnapshot = {
  customers: [],
  sessions: [],
  complianceDocs: {},
  complianceSteps: {},
};

export function isLocalDevPersistenceEnabled(): boolean {
  return (
    typeof process !== 'undefined' &&
    Boolean(process.versions?.node) &&
    process.env.NODE_ENV !== 'production' &&
    process.env.NODE_ENV !== 'test'
  );
}

async function getStorePath(): Promise<string> {
  const osMod = await import(/* @vite-ignore */ 'node:' + 'os');
  const pathMod = await import(/* @vite-ignore */ 'node:' + 'path');
  return pathMod.join(osMod.tmpdir(), 'lagence-dev-auth-store.json');
}

export async function loadDevAuthSnapshot(): Promise<DevAuthSnapshot> {
  if (!isLocalDevPersistenceEnabled()) return EMPTY_SNAPSHOT;
  try {
    const fsMod = await import(/* @vite-ignore */ 'node:' + 'fs/promises');
    const filePath = await getStorePath();
    const raw = await fsMod.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      customers: Array.isArray(parsed?.customers) ? parsed.customers : [],
      sessions: Array.isArray(parsed?.sessions) ? parsed.sessions : [],
      complianceDocs:
        parsed?.complianceDocs && typeof parsed.complianceDocs === 'object'
          ? parsed.complianceDocs
          : {},
      complianceSteps:
        parsed?.complianceSteps && typeof parsed.complianceSteps === 'object'
          ? parsed.complianceSteps
          : {},
    };
  } catch {
    return EMPTY_SNAPSHOT;
  }
}

export async function saveDevAuthSnapshot(snapshot: DevAuthSnapshot): Promise<void> {
  if (!isLocalDevPersistenceEnabled()) return;
  try {
    const fsMod = await import(/* @vite-ignore */ 'node:' + 'fs/promises');
    const filePath = await getStorePath();
    await fsMod.writeFile(filePath, JSON.stringify(snapshot), 'utf8');
  } catch {
    // Non-fatal in ephemeral environments
  }
}
