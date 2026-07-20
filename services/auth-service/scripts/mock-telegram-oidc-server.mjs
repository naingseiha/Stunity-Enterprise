// Local-only mock OIDC provider for testing "Continue with Telegram" without
// real Telegram credentials. Implements just enough of an OIDC Authorization
// Code + PKCE flow (GET /authorize, POST /token, GET /jwks) for
// telegramOidc.ts to exercise the real code path end to end.
//
// This is NOT a real identity provider: /authorize auto-approves every
// request instead of showing a login screen. Never point this at anything
// but local dev testing.
//
// Usage: node scripts/mock-telegram-oidc-server.mjs [port]
// Then set in your .env:
//   AUTH_TELEGRAM_OIDC_ENABLED=true
//   TELEGRAM_OIDC_CLIENT_ID=mock-client
//   TELEGRAM_OIDC_CLIENT_SECRET=mock-secret
//   TELEGRAM_OIDC_ISSUER=http://localhost:4500
//   TELEGRAM_OIDC_AUTHORIZATION_ENDPOINT=http://localhost:4500/authorize
//   TELEGRAM_OIDC_TOKEN_ENDPOINT=http://localhost:4500/token
//   TELEGRAM_OIDC_JWKS_URI=http://localhost:4500/jwks
//   TELEGRAM_OIDC_REDIRECT_URI=http://localhost:3001/auth/oidc/telegram/callback

import http from 'node:http';
import crypto from 'node:crypto';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';

const port = Number(process.argv[2] || process.env.MOCK_TELEGRAM_OIDC_PORT || 4500);
// Derived per-request from the Host header (not hardcoded to localhost) so
// the same running instance works whether it's reached as localhost:4500
// (web) or a LAN IP like 192.168.x.x:4500 (mobile device/simulator) — the
// issuer embedded in the id_token must exactly match whatever
// TELEGRAM_OIDC_ISSUER the caller configured, and that differs per client.
const issuerFor = (req) => `http://${req.headers.host}`;
const { publicKey, privateKey } = await generateKeyPair('RS256');
const jwk = await exportJWK(publicKey);
jwk.kid = 'mock-key-1';
jwk.alg = 'RS256';
jwk.use = 'sig';

// authorization code -> { nonce, clientId, subject } for the /token exchange
const pendingCodes = new Map();

function send(res, status, body, headers = {}) {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': typeof body === 'string' ? 'text/html' : 'application/json', ...headers });
  res.end(payload);
}

const server = http.createServer(async (req, res) => {
  const issuer = issuerFor(req);
  const url = new URL(req.url, issuer);

  if (req.method === 'GET' && url.pathname === '/authorize') {
    const clientId = url.searchParams.get('client_id') || '';
    const redirectUri = url.searchParams.get('redirect_uri') || '';
    const state = url.searchParams.get('state') || '';
    const nonce = url.searchParams.get('nonce') || '';
    if (!redirectUri) return send(res, 400, 'Missing redirect_uri');

    // A real provider shows a login/consent screen here. This mock
    // auto-approves as a fixed test identity so the redirect flow can be
    // exercised without any UI.
    const code = crypto.randomUUID();
    pendingCodes.set(code, {
      nonce,
      clientId,
      subject: 'mock-telegram-user-1',
      name: 'Sokha Chan',
      email: 'sokha.mock@example.com',
    });

    const callback = new URL(redirectUri);
    callback.searchParams.set('code', code);
    callback.searchParams.set('state', state);
    res.writeHead(302, { Location: callback.toString() });
    return res.end();
  }

  if (req.method === 'POST' && url.pathname === '/token') {
    let body = '';
    for await (const chunk of req) body += chunk;
    const params = new URLSearchParams(body);
    const code = params.get('code') || '';
    const entry = pendingCodes.get(code);
    if (!entry) return send(res, 400, { error: 'invalid_grant' });
    pendingCodes.delete(code);

    const idToken = await new SignJWT({
      nonce: entry.nonce,
      name: entry.name,
      email: entry.email,
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'mock-key-1' })
      .setIssuer(issuer)
      .setAudience(entry.clientId)
      .setSubject(entry.subject)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey);

    return send(res, 200, { id_token: idToken, token_type: 'Bearer' });
  }

  if (req.method === 'GET' && url.pathname === '/jwks') {
    return send(res, 200, { keys: [jwk] });
  }

  send(res, 404, { error: 'not_found' });
});

server.listen(port, () => {
  console.log(`[mock-telegram-oidc] listening on :${port}`);
  console.log(`[mock-telegram-oidc] issuer is derived per-request from the Host header — set`);
  console.log(`[mock-telegram-oidc] TELEGRAM_OIDC_ISSUER to whatever host:port the caller uses`);
  console.log(`[mock-telegram-oidc] to reach this server (e.g. http://localhost:${port} or`);
  console.log(`[mock-telegram-oidc] http://<your-lan-ip>:${port}).`);
});
