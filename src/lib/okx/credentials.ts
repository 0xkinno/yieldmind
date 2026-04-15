export function getOkxCredentials() {
  const apiKey = process.env.OKX_API_KEY?.trim();
  const secretKey = process.env.OKX_SECRET_KEY?.trim();
  const passphrase = process.env.OKX_PASSPHRASE?.trim();
  const project = process.env.OKX_ACCESS_PROJECT?.trim();

  if (!apiKey || !secretKey || !passphrase) {
    throw new Error(
      "Missing OKX credentials. Set OKX_API_KEY, OKX_SECRET_KEY, and OKX_PASSPHRASE in .env.local."
    );
  }

  return { apiKey, secretKey, passphrase, project };
}
