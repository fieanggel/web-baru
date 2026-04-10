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

Server berjalan di `http://localhost:4000` dan endpoint user di `http://localhost:4000/api/users`.

## MySQL (Laragon) setup

1. Pastikan Laragon berjalan dan MySQL aktif (Menu → Start All).
2. Buat database dan tabel dengan mengimpor `db/init.sql`:

```bash
cd backend
mysql -u root < db/init.sql
```

Jika MySQL di Laragon menggunakan password kosong, perintah di atas sudah cukup. Jika Anda menggunakan password, jalankan `mysql -u <user> -p < db/init.sql`.

3. Salin `.env.example` menjadi `.env` dan sesuaikan kredensial bila perlu.

4. Install dependency dan jalankan server:

```bash
npm install
npm run dev
```

Server akan membaca koneksi dari `.env` dan terhubung ke MySQL.
