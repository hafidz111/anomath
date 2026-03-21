#!/usr/bin/env node
/**
 * Uji integrasi: guru buat kelas + case + puzzle → murid join → list case → submit jawaban puzzle.
 * Butuh backend Django di API_URL (default http://127.0.0.1:8000).
 *
 * Usage: npm run test:student-flow
 */

const API = process.env.API_URL || 'http://127.0.0.1:8000';

function fail(msg) {
  console.error(`\x1b[31m✗\x1b[0m ${msg}`);
  process.exit(1);
}

function ok(msg) {
  console.log(`\x1b[32m✓\x1b[0m ${msg}`);
}

async function request(path, { method = 'GET', token, body } = {}) {
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (body != null) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: payload,
  });
  const text = await res.text();
  let json = {};
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { _raw: text };
    }
  }
  return { res, json };
}

function unwrap(json, context) {
  if (json.success === false) {
    const msg = typeof json.message === 'string' ? json.message : JSON.stringify(json.message);
    throw new Error(`${context}: ${msg}`);
  }
  return json.data;
}

async function registerAndLogin(email, password, name, role) {
  const reg = await request('/api/auth/register/', {
    method: 'POST',
    body: { name, email, password, role },
  });
  if (!reg.res.ok) {
    throw new Error(`register ${email}: ${reg.res.status} ${JSON.stringify(reg.json)}`);
  }
  const login = await request('/api/auth/login/', {
    method: 'POST',
    body: { email, password },
  });
  if (!login.res.ok || !login.json.success) {
    throw new Error(`login ${email}: ${login.res.status}`);
  }
  return login.json.data.access;
}

async function main() {
  console.log(`API: ${API}\n`);

  const t = Date.now();
  const teacherEmail = `t-flow-${t}@test.local`;
  const studentEmail = `s-flow-${t}@test.local`;
  const password = 'password123';

  ok('Daftar + login guru');
  const teacherToken = await registerAndLogin(
    teacherEmail,
    password,
    `Guru ${t}`,
    'teacher',
  );

  ok('Buat kelas (POST /api/admin/classes/)');
  const classRes = await request('/api/admin/classes/', {
    method: 'POST',
    token: teacherToken,
    body: {
      name: `Kelas Uji ${t}`,
      grade: 7,
      student_count: 0,
      work_mode: 'individual',
    },
  });
  if (!classRes.res.ok) fail(`Buat kelas: ${classRes.res.status} ${JSON.stringify(classRes.json)}`);
  const classroom = unwrap(classRes.json, 'create class');
  const classId = classroom.id;
  const joinCode = classroom.join_code;
  if (!joinCode) fail('Kelas tidak punya join_code');

  ok('Buat case');
  const caseRes = await request('/api/cases/', {
    method: 'POST',
    token: teacherToken,
    body: {
      title: `Case Uji ${t}`,
      description: 'Paragraf satu.\n\nParagraf dua.\n\nTujuan akhir.',
      difficulty: 'easy',
    },
  });
  if (!caseRes.res.ok) fail(`Buat case: ${caseRes.res.status} ${JSON.stringify(caseRes.json)}`);
  const caseData = unwrap(caseRes.json, 'create case');
  const caseId = caseData.id;

  ok('Tautkan case ke kelas (PATCH case_ids)');
  const patchRes = await request(`/api/admin/classes/${classId}/`, {
    method: 'PATCH',
    token: teacherToken,
    body: { case_ids: [caseId] },
  });
  if (!patchRes.res.ok) {
    fail(`PATCH kelas: ${patchRes.res.status} ${JSON.stringify(patchRes.json)}`);
  }

  const PUZZLE_ANSWER = '42';
  ok('Buat puzzle');
  const puzzleRes = await request(`/api/cases/${caseId}/puzzles/`, {
    method: 'POST',
    token: teacherToken,
    body: {
      question: 'Berapa hasil 40 + 2?',
      answer: PUZZLE_ANSWER,
      explanation: 'Penjumlahan dasar.',
    },
  });
  if (!puzzleRes.res.ok) {
    fail(`Buat puzzle: ${puzzleRes.res.status} ${JSON.stringify(puzzleRes.json)}`);
  }
  const puzzleData = unwrap(puzzleRes.json, 'create puzzle');
  const puzzleId = puzzleData.id;

  ok('Daftar + login murid');
  const studentToken = await registerAndLogin(
    studentEmail,
    password,
    `Murid ${t}`,
    'student',
  );

  ok('Murid join kelas (POST join_code)');
  const joinRes = await request('/api/student/classes/join/', {
    method: 'POST',
    token: studentToken,
    body: { join_code: joinCode },
  });
  if (!joinRes.res.ok) {
    fail(`Join: ${joinRes.res.status} ${JSON.stringify(joinRes.json)}`);
  }
  unwrap(joinRes.json, 'join');

  ok('GET /api/cases/?class_id=… (murid terdaftar)');
  const listRes = await request(`/api/cases/?class_id=${encodeURIComponent(classId)}`, {
    token: studentToken,
  });
  if (!listRes.res.ok) fail(`List case: ${listRes.res.status}`);
  const listData = unwrap(listRes.json, 'list cases');
  const cases = listData.cases ?? [];
  if (!cases.some((c) => String(c.id) === String(caseId))) {
    fail('Case tidak muncul di daftar untuk kelas ini');
  }

  ok('Submit jawaban puzzle (benar)');
  const submitRes = await request(`/api/puzzles/${puzzleId}/submit/`, {
    method: 'POST',
    token: studentToken,
    body: { answer: PUZZLE_ANSWER },
  });
  if (!submitRes.res.ok) {
    fail(`Submit: ${submitRes.res.status} ${JSON.stringify(submitRes.json)}`);
  }
  const result = unwrap(submitRes.json, 'submit');
  if (!result.correct) {
    fail(`Jawaban seharusnya benar, dapat: ${JSON.stringify(result)}`);
  }

  ok('Submit lagi setelah case selesai (harus tidak dihitung benar)');
  const again = await request(`/api/puzzles/${puzzleId}/submit/`, {
    method: 'POST',
    token: studentToken,
    body: { answer: PUZZLE_ANSWER },
  });
  if (!again.res.ok) fail(`Submit ulang: ${again.res.status}`);
  const againData = unwrap(again.json, 'submit again');
  if (againData.correct !== false) {
    fail(`Setelah selesai, submit ulang harus correct=false, dapat ${JSON.stringify(againData)}`);
  }

  console.log(`\n\x1b[32mSemua langkah alur murid OK.\x1b[0m`);
  console.log(`  Guru: ${teacherEmail}`);
  console.log(`  Murid: ${studentEmail}`);
  console.log(`  Kode kelas: ${joinCode}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
