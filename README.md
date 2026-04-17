# web-baru

Proyek ini berisi 3 service utama:

- Frontend Next.js
- Backend Node.js/Express
- Nginx reverse proxy

## Menjalankan dengan Docker Compose

1. Salin contoh env:

```bash
cp .env.example .env
```

Untuk Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

2. Build image lokal:

```bash
docker compose build
```

3. Jalankan semua service:

```bash
docker compose up -d
```

4. Cek status container:

```bash
docker compose ps
```

## Push image ke Docker Hub

Compose utama sudah dikonfigurasi dengan `build` + `image`, sehingga image lokal langsung ditag untuk Docker Hub.

1. Atur nilai berikut di file `.env`:

```env
DOCKERHUB_USERNAME=username_dockerhub_anda
IMAGE_TAG=latest
NEXT_PUBLIC_API_BASE_URL=/api
```

2. Login ke Docker Hub:

```bash
docker login
```

3. Build dan push image:

```bash
docker compose build
docker compose push
```

Image yang akan dipush:

- `${DOCKERHUB_USERNAME}/fedifie:${IMAGE_TAG}`
- `${DOCKERHUB_USERNAME}/bedifie:${IMAGE_TAG}`

## Deploy di EC2

Folder deployment:

- `deployment/ec2-be` untuk backend
- `deployment/ec2-fe` untuk frontend

Kedua file compose deployment menggunakan variabel yang sama:

- `DOCKERHUB_USERNAME`
- `IMAGE_TAG`

Contoh di server:

```bash
docker compose pull
docker compose up -d
```