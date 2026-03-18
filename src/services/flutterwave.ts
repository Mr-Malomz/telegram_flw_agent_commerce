let accessToken: string | null = null;
let expiresIn = 0;
let lastRefreshTime = 0;

const TOKEN_URL =
  "https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token";

function getBaseUrl(): string {
  return process.env.FLW_BASE_URL || "https://developersandbox-api.flutterwave.com";
}

async function refreshToken(): Promise<void> {
  if (!process.env.FLW_CLIENT_ID || !process.env.FLW_CLIENT_SECRET) {
    throw new Error("Missing FLW_CLIENT_ID or FLW_CLIENT_SECRET in .env");
  }

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.FLW_CLIENT_ID,
      client_secret: process.env.FLW_CLIENT_SECRET,
      grant_type: "client_credentials",
    }),
  });

  const data = (await response.json()) as Record<string, unknown>;

  if (!data.access_token) {
    console.error("[FLW] Token refresh failed:", JSON.stringify(data));
    throw new Error("Failed to obtain Flutterwave access token");
  }

  accessToken = data.access_token as string;
  expiresIn = data.expires_in as number;
  lastRefreshTime = Date.now();
  console.log("[FLW] Token refreshed, expires in", expiresIn, "seconds");
}

async function getAccessToken(): Promise<string> {
  const elapsed = (Date.now() - lastRefreshTime) / 1000;
  const remaining = expiresIn - elapsed;

  if (!accessToken || remaining < 60) {
    await refreshToken();
  }

  return accessToken!;
}

interface FlwRequestOptions {
  method: string;
  path: string;
  body?: Record<string, unknown>;
  idempotencyKey?: string;
  scenarioKey?: string;
}

export async function flwRequest<T>(options: FlwRequestOptions): Promise<T> {
  const token = await getAccessToken();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (options.idempotencyKey) {
    headers["X-Idempotency-Key"] = options.idempotencyKey;
  }

  if (options.scenarioKey) {
    headers["X-Scenario-Key"] = options.scenarioKey;
  }

  const url = `${getBaseUrl()}${options.path}`;
  const response = await fetch(url, {
    method: options.method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const result = (await response.json()) as T;

  if ((result as Record<string, unknown>).status !== "success") {
    console.error(`[FLW] ${options.method} ${options.path} failed:`, JSON.stringify(result));
  }

  return result;
}

interface FlwCustomerResponse {
  status: string;
  data: { id: string; email: string };
}

export async function createFlwCustomer(
  firstName: string,
  lastName: string,
  email: string,
  idempotencyKey: string
): Promise<FlwCustomerResponse> {
  return flwRequest<FlwCustomerResponse>({
    method: "POST",
    path: "/customers",
    body: {
      name: { first: firstName, last: lastName },
      email,
    },
    idempotencyKey,
  });
}

interface VirtualAccountData {
  id: string;
  amount: number;
  account_number: string;
  reference: string;
  account_bank_name: string;
  account_type: string;
  status: string;
  account_expiration_datetime: string;
  note: string;
  customer_id: string;
}

interface FlwVirtualAccountResponse {
  status: string;
  data: VirtualAccountData;
}

export async function createDynamicVirtualAccount(
  reference: string,
  customerId: string,
  amount: number,
  currency: string,
  narration: string,
  expirySeconds: number = 3600,
  idempotencyKey: string,
  scenarioKey?: string
): Promise<FlwVirtualAccountResponse> {
  return flwRequest<FlwVirtualAccountResponse>({
    method: "POST",
    path: "/virtual-accounts",
    body: {
      reference,
      customer_id: customerId,
      amount,
      currency,
      account_type: "dynamic",
      narration,
      expiry: expirySeconds,
    },
    idempotencyKey,
    scenarioKey,
  });
}

interface FlwChargeResponse {
  status: string;
  data: {
    id: string;
    amount: number;
    currency: string;
    reference: string;
    status: string;
  };
}

export async function verifyCharge(chargeId: string): Promise<FlwChargeResponse> {
  return flwRequest<FlwChargeResponse>({
    method: "GET",
    path: `/charges/${chargeId}`,
  });
}
