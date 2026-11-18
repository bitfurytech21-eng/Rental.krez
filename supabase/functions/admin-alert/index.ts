import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type WebhookRecord = Record<string, unknown>;

type DatabaseWebhook = {
  type?: string;
  table?: string;
  schema?: string;
  record?: WebhookRecord | null;
  old_record?: WebhookRecord | null;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

function euro(value: unknown): string {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) return "an unspecified amount";
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
  }).format(Math.abs(amount));
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const expectedSecret = Deno.env.get("WEBHOOK_SECRET") ?? "";
  const suppliedSecret = req.headers.get("x-webhook-secret") ?? "";
  if (!expectedSecret || !suppliedSecret || !constantTimeEqual(suppliedSecret, expectedSecret)) {
    return new Response("Forbidden", { status: 403 });
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
  const from = Deno.env.get("ALERT_FROM") ?? "";
  const to = Deno.env.get("ADMIN_EMAIL") ?? "";
  if (!resendApiKey || !from || !to) {
    console.error("Admin alert email configuration is incomplete");
    return json({ error: "Alert email is not configured" }, 500);
  }

  let payload: DatabaseWebhook;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON payload" }, 400);
  }

  if (payload.schema && payload.schema !== "public") return json({ ignored: true });
  const record = payload.record;
  if (!record || record.status !== "pending") return json({ ignored: true });

  let subject = "";
  let line = "";

  // The live schema stores financial activity in ledger_transactions.
  // Its amount column is EUR numeric, not integer cents.
  if (payload.table === "ledger_transactions") {
    const kind = typeof record.type === "string" ? record.type : "financial";
    const amount = euro(record.amount);
    const reference = typeof record.reference === "string" ? record.reference : "-";
    subject = `New ${kind} request: ${amount}`;
    line = `A ${kind} request for ${amount} (ref ${reference}) is waiting for review.`;
  } else if (payload.table === "manual_deposit_submissions") {
    const amount = euro(record.amount);
    const reference = typeof record.reference === "string" ? record.reference : "-";
    subject = `New deposit submission: ${amount}`;
    line = `A manual deposit submission for ${amount} (ref ${reference}) is waiting for review.`;
  } else if (payload.table === "kyc_submissions") {
    const docType = typeof record.doc_type === "string" ? record.doc_type : "identity";
    subject = `New KYC document: ${docType}`;
    line = `An investor submitted a ${docType} document for review.`;
  } else {
    // investment_requests and transactions are not tables in the live schema.
    return json({ ignored: true });
  }

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        text: `${line}\n\nOpen your admin panel to review it.`,
      }),
    });
  } catch (error) {
    console.error("Resend request failed", error);
    return json({ error: "Email provider request failed" }, 502);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("Resend rejected admin alert", response.status, detail.slice(0, 500));
    return json({ error: "Email provider rejected the alert" }, 502);
  }

  return json({ sent: true });
});
