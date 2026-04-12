# Backend (Node.js + Express)

Instalasi dan menjalankan:

1. Masuk ke folder `backend`:

```bash
cd backend
```

2. Install dependencies:

```bash
npm install
```

3. Jalankan server (development):

```bash
npm run dev
```

Server berjalan di `http://localhost:4000`.

Tersedia endpoint:

- `GET /api/users`
- `POST /api/users`
- `PUT /api/users/:id`
- `DELETE /api/users/:id`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/categories`
- `POST /api/deposits` (auth required)
- `GET /api/deposits/my` (auth required)
- `GET /api/admin/dashboard` (auth + admin)
- `GET /api/admin/monitoring-queue` (auth + admin)
- `GET /api/admin/categories` (auth + admin)
- `PUT /api/admin/categories/:id` (auth + admin)
- `PATCH /api/admin/deposits/approve/:id` (auth + admin)
- `PATCH /api/admin/deposits/reject/:id` (auth + admin)

## MySQL (Laragon) setup

1. Pastikan Laragon berjalan dan MySQL aktif (Menu → Start All).
2. Buat database dan tabel dengan mengimpor `db/init.sql` atau jalankan migrasi:

```bash
cd backend
npm run migrate
```

Jika MySQL di Laragon menggunakan password kosong, perintah di atas sudah cukup. Jika Anda menggunakan password, jalankan `mysql -u <user> -p < db/init.sql`.

3. Salin `.env.example` menjadi `.env` dan sesuaikan kredensial bila perlu.

4. Install dependency dan jalankan server:

```bash
npm install
npm run dev
```

Server akan membaca koneksi dari `.env` dan terhubung ke MySQL.

Saat server dijalankan dengan `npm start` atau `npm run dev`, migrasi juga akan dijalankan otomatis sebelum server listen.

## Struktur backend

- `src/controllers`: request/response handler
- `src/models`: query database per entitas
- `src/routes`: definisi endpoint
- `src/middlewares`: auth JWT dan role check

## Auth flow

- Register mengirim `name`, `email`, dan `password` ke `POST /api/auth/register`.
- Login mengirim `email` dan `password` ke `POST /api/auth/login`.
- Password disimpan sebagai hash PBKDF2 di kolom `password_hash`.
- Login/Register mengembalikan JWT token di field `token`.

## Admin role

Endpoint `/api/admin/*` hanya bisa diakses oleh user dengan role `ADMIN` di tabel `users`.

Contoh promosi user ke admin:

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'admin@example.com';
```
