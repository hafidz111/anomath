# Anomath (React + Vite)

## Panduan pengguna

| Dokumen | Isi |
|--------|-----|
| [docs/PANDUAN_GURU.md](docs/PANDUAN_GURU.md) | Teacher Dashboard, kelas, case & puzzle builder, performa |
| [docs/PANDUAN_MURID.md](docs/PANDUAN_MURID.md) | Dashboard siswa, alur case → puzzle → final → hasil |
| [docs/SKENARIO_KELAS_DAN_SISWA.md](docs/SKENARIO_KELAS_DAN_SISWA.md) | Alur: guru buat kelas + siswa bermain (tautan `?code=`) |

## Backend API (login / register)

Login dan register memanggil Django REST di folder `anomath-backend/`.

1. **Wajib** jalankan backend dulu: `cd anomath-backend && python manage.py runserver` → `http://127.0.0.1:8000`.
2. File **`anomath/.env`** memakai `VITE_API_BASE_URL=http://127.0.0.1:8000` agar browser memanggil Django **langsung** (bukan lewat proxy Vite). Ini menghindari **502 Bad Gateway** saat proxy tidak bisa menyambung ke port 8000.
3. Setelah mengubah `.env`, **restart** `npm run dev`.
4. Password daftar minimal **8 karakter** (validasi backend).

Token disimpan di `localStorage`: `anomath_access`, `anomath_refresh`, `anomath_role`, `anomath_user`.

## Halaman Admin (`/admin/*`)

Dashboard, Users, Cases, dan Puzzles memuat data dari **`/api/admin/...`** (Bearer JWT). **Wajib login sebagai user dengan role `admin`**, kalau tidak API mengembalikan 403.

Halaman **Pengguna** (`/admin/users`): daftar, **panel kanan** untuk detail & edit, suspend (`is_active`), dan hapus — memakai `GET/PATCH/DELETE /api/admin/users/<id>/`.

Modul: `src/lib/api/client.js` (`apiFetch`) dan `src/lib/api/admin.js`.

- **Review kelas publik** (`/admin/class-review`): antrian kelas berstatus `pending_public` — **Setujui** → `listing_status: public`, **Tolak** → `private` (`PATCH /api/admin/classes/<id>/`).
- **Leaderboard** (`/admin/leaderboard`): global, per kelas, dan tim — `GET /api/admin/leaderboard/`, `/leaderboard/classes/`, `/leaderboard/teams/`.
- **Pengaturan** (`/admin/settings`): **GET/PATCH `/api/admin/settings/`** (bukan hanya UI lokal). Snapshot statistik tetap dari `GET /api/admin/stats/`.

## Halaman Teacher (`/teacher/*`)

**Teacher Dashboard** memuat ringkasan kelas & case seperti sebelumnya, plus agregat analitik dari **`GET /api/teacher/dashboard/`** (role `teacher`): peringkat siswa, aktivitas mingguan, leaderboard, dan quick stats — semuanya berdasarkan progres pada case yang Anda buat atau case yang dipakai di kelas Anda.

Modul: `src/lib/api/teacher.js`. Manajemen kelas tetap memakai `src/lib/api/admin.js` (`/api/admin/classes/`, di-filter server untuk guru).

### Jika masih 502

- Pastikan Django benar‑benar jalan (buka `http://127.0.0.1:8000/admin/`).
- Pastikan tidak ada proses lain yang memakai port 8000.

---

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
