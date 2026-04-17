# Frontend (Next.js)

Frontend ini menyediakan halaman demo upload gambar ke backend Node.js (endpoint `POST /api/upload`) pada route:

- `http://localhost:3000/upload`

## Menjalankan di Lokal

1. Install dependency:

```bash
cd frontend
npm install
```

2. Buat file `.env.local` lalu isi base URL backend:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

3. Jalankan development server:

```bash
npm run dev
```

4. Buka:

- Home: `http://localhost:3000`
- Demo upload S3: `http://localhost:3000/upload`

## Cara kerja form upload

- Komponen upload ada di `components/S3UploadForm.tsx`.
- Input file menerima image (`accept="image/*"`).
- File dikirim menggunakan `fetch` + `FormData` ke backend.
- Jika berhasil, komponen menampilkan preview dari URL publik S3 yang dikembalikan backend.

## Catatan

- Pastikan backend berjalan dulu di `http://localhost:4000`.
- Jika preview tidak muncul, cek policy bucket S3 apakah object dapat diakses publik.
