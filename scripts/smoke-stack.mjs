#!/usr/bin/env node
/**
 * Smoke test: Vite (frontend) + Django (API) harus sudah jalan.
 * Tidak mengganti pengujian manual di browser — hanya memastikan stack hidup.
 *
 * Usage: npm run test:smoke
 * Env: FRONTEND_URL (default http://127.0.0.1:5173), API_URL (default http://127.0.0.1:8000)
 */

const FRONTEND = process.env.FRONTEND_URL || 'http://127.0.0.1:5173';
const API = process.env.API_URL || 'http://127.0.0.1:8000';

function fail(msg) {
  console.error(`\x1b[31m✗\x1b[0m ${msg}`);
  process.exit(1);
}

function ok(msg) {
  console.log(`\x1b[32m✓\x1b[0m ${msg}`);
}

async function main() {
  console.log(`Frontend: ${FRONTEND}\nAPI:      ${API}\n`);

  const home = await fetch(FRONTEND, { redirect: 'follow' });
  if (!home.ok) fail(`GET ${FRONTEND} → ${home.status}`);
  const html = await home.text();
  if (!/anomath|root/i.test(html)) {
    fail(`GET ${FRONTEND} — body tidak terlihat seperti SPA Anomath`);
  }
  ok(`GET ${FRONTEND} → ${home.status}`);

  const loginPage = await fetch(`${FRONTEND.replace(/\/$/, '')}/login`);
  if (!loginPage.ok) fail(`GET /login → ${loginPage.status}`);
  ok(`GET ${FRONTEND}/login → ${loginPage.status}`);

  const me = await fetch(`${API}/api/auth/me/`, {
    headers: { Accept: 'application/json' },
  });
  if (me.status !== 401) fail(`GET /api/auth/me/ tanpa token → ${me.status} (harus 401)`);
  ok('GET /api/auth/me/ tanpa token → 401');

  const suffix = `${Date.now()}`;
  const email = `smoke-${suffix}@test.local`;
  const password = 'password123';

  const reg = await fetch(`${API}/api/auth/register/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      name: `Smoke ${suffix}`,
      email,
      password,
      role: 'student',
    }),
  });
  const regJson = await reg.json().catch(() => ({}));
  if (!reg.ok) fail(`POST /api/auth/register/ → ${reg.status} ${JSON.stringify(regJson)}`);
  ok(`POST /api/auth/register/ → ${reg.status}`);

  const loginRes = await fetch(`${API}/api/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const loginJson = await loginRes.json().catch(() => ({}));
  if (!loginRes.ok || !loginJson.success || !loginJson.data?.access) {
    fail(`POST /api/auth/login/ → ${loginRes.status} ${JSON.stringify(loginJson)}`);
  }
  ok('POST /api/auth/login/ → token OK');

  const meAuth = await fetch(`${API}/api/auth/me/`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${loginJson.data.access}`,
    },
  });
  const meJson = await meAuth.json().catch(() => ({}));
  if (!meAuth.ok || !meJson.success) {
    fail(`GET /api/auth/me/ dengan token → ${meAuth.status}`);
  }
  ok(`GET /api/auth/me/ dengan token → ${meAuth.status} (${meJson.data?.email})`);

  console.log('\nSemua smoke check lulus. Uji UI di browser: buka FRONTEND, login dengan user baru di atas.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
