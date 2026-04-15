import { createHmac } from "crypto";

/**
 * OKX Web3 / v5-style signing.
 * prehash = timestamp + method + requestPath + body
 * requestPath must include query string for GET requests.
 */
export function signOkxRequest(params: {
  secretKey: string;
  timestampIso: string;
  method: "GET" | "POST";
  requestPath: string;
  body: string;
}): string {
  const prehash =
    params.timestampIso + params.method + params.requestPath + params.body;
  return createHmac("sha256", params.secretKey).update(prehash).digest("base64");
}
