# Backend (Node.js + Express)

Backend ini sudah mendukung upload foto bukti laporan ke Amazon S3 melalui endpoint `POST /api/upload`.

## Package yang perlu diinstall

Masuk ke folder backend lalu install dependency:

```bash
cd backend
npm install
```

Dependency utama upload S3:

- `@aws-sdk/client-s3`
- `multer`

## Environment Variables

Salin file `.env.example` menjadi `.env`, lalu isi value yang dibutuhkan:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=user_crud
PORT=4000
JWT_SECRET=replace-this-with-a-strong-secret
JWT_EXPIRES_IN=7d
ADMIN_SEED_NAME=Administrator
ADMIN_SEED_EMAIL=admin@gmail.com
ADMIN_SEED_PASSWORD=admin123
ADMIN_SEED_FORCE_PASSWORD_RESET=false

AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=ap-southeast-1
AWS_S3_BUCKET_NAME=nama-bucket-anda
```

Catatan: URL yang dikembalikan endpoint upload bersifat publik. Pastikan bucket/object policy mengizinkan read publik jika Anda ingin URL bisa dipreview langsung di browser.

## Menjalankan di Lokal

```bash
cd backend
npm run dev
```

Server akan berjalan di `http://localhost:4000`.

Saat server start, backend akan otomatis menjalankan migrasi database dan seed akun admin.

Default akun seed admin:

- Email: `admin@gmail.com`
- Password: `admin123`

Sangat disarankan mengganti `ADMIN_SEED_PASSWORD` di environment produksi.

## Endpoint yang tersedia

- `GET /api/users`
- `POST /api/users`
- `PUT /api/users/:id`
- `DELETE /api/users/:id`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/categories`
- `POST /api/deposits` (auth required)
- `GET /api/deposits/my` (auth required)
- `POST /api/upload` (multipart/form-data, field file: `photo`)
- `GET /api/admin/dashboard` (auth + admin)
- `GET /api/admin/monitoring-queue` (auth + admin)
- `GET /api/admin/categories` (auth + admin)
- `PUT /api/admin/categories/:id` (auth + admin)
- `PATCH /api/admin/deposits/approve/:id` (auth + admin)
- `PATCH /api/admin/deposits/reject/:id` (auth + admin)

## Contoh Request Upload ke S3

```bash
curl -X POST http://localhost:4000/api/upload \
	-F "photo=@C:/path/ke/foto-bukti.jpg"
```

Contoh response sukses:

```json
{
	"success": true,
	"message": "Upload successful",
	"data": {
		"url": "https://bucket-anda.s3.ap-southeast-1.amazonaws.com/reports/1713350000000-uuid.jpg",
		"key": "reports/1713350000000-uuid.jpg",
		"bucket": "bucket-anda"
	}
}
```

## Integrasi Simpan URL ke Database

Kolom baru pada tabel `deposits`:

- `report_photo_url` (TEXT, nullable)

Backend sekarang menerima field opsional `reportPhotoUrl` saat membuat deposit:

```json
{
	"categoryId": 1,
	"estimatedWeight": 3.5,
	"reportPhotoUrl": "https://bucket-anda.s3.ap-southeast-1.amazonaws.com/reports/1713350000000-uuid.jpg"
}
```

### Contoh SQL MySQL

```sql
ALTER TABLE deposits ADD COLUMN report_photo_url TEXT NULL;

INSERT INTO deposits (id, user_id, category_id, estimated_weight, report_photo_url, status)
VALUES ('uuid-value', 1, 2, 3.50, 'https://bucket.s3.ap-southeast-1.amazonaws.com/reports/file.jpg', 'PENDING');
```

### Contoh SQL PostgreSQL

```sql
ALTER TABLE deposits ADD COLUMN report_photo_url TEXT;

INSERT INTO deposits (id, user_id, category_id, estimated_weight, report_photo_url, status)
VALUES ('uuid-value', 1, 2, 3.50, 'https://bucket.s3.ap-southeast-1.amazonaws.com/reports/file.jpg', 'PENDING');
```

## Struktur backend

- `src/controllers`: request/response handler
- `src/models`: query database per entitas
- `src/routes`: definisi endpoint
- `src/middlewares`: auth JWT dan role check
- `src/utils/s3Config.js`: inisialisasi S3 client
