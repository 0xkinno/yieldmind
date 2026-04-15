import { OKX_WEB3_BASE } from "./config";
import { getOkxCredentials } from "./credentials";
import { signOkxRequest } from "./sign";

type OkxJson = { code: string | number; msg?: string; data?: unknown };

function isOkxSuccess(code: string | number | undefined): boolean {
  return code === "0" || code === 0;
}

async function okxRequest<T extends OkxJson>(opts: {
  method: "GET" | "POST";
  requestPath: string;
  body?: string;
}): Promise<T> {
  const { apiKey, secretKey, passphrase, project } = getOkxCredentials();
  const timestampIso = new Date().toISOString();
  const body = opts.body ?? "";
  const sign = signOkxRequest({
    secretKey,
    timestampIso,
    method: opts.method,
    requestPath: opts.requestPath,
    body
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "OK-ACCESS-KEY": apiKey,
    "OK-ACCESS-SIGN": sign,
    "OK-ACCESS-PASSPHRASE": passphrase,
    "OK-ACCESS-TIMESTAMP": timestampIso
  };
  if (project) {
    headers["OK-ACCESS-PROJECT"] = project;
  }

  const url = `${OKX_WEB3_BASE}${opts.requestPath}`;
  const res = await fetch(url, {
    method: opts.method,
    headers,
    body: opts.method === "POST" ? body : undefined,
    cache: "no-store"
  });

  const text = await res.text();
  let json: T;
  try {
    json = JSON.parse(text) as T;
  } catch {
    throw new Error(
      `OKX response was not JSON (${res.status}): ${text.slice(0, 500)}`
    );
  }

  if (!res.ok) {
    throw new Error(
      `OKX HTTP ${res.status}: ${json.msg ?? text.slice(0, 400)}`
    );
  }

  if (!isOkxSuccess(json.code)) {
    throw new Error(
      String(json.msg || `OKX error code ${json.code}`)
    );
  }

  return json;
}

export async function okxGet<T extends OkxJson>(requestPath: string) {
  return okxRequest<T>({ method: "GET", requestPath });
}

export async function okxPost<T extends OkxJson>(
  requestPath: string,
  body: unknown
) {
  return okxRequest<T>({
    method: "POST",
    requestPath,
    body: JSON.stringify(body)
  });
}
