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

## Konfigurasi 3-Tier AWS (UTS)

Infrastruktur terbaru:

- Frontend public: `98.80.187.179`
- Backend private: `10.20.2.77:8080`
- RDS endpoint: `dbdifie.cgxgc8wsgidd.us-east-1.rds.amazonaws.com`

### 1. Backend .env (Node.js) untuk RDS baru

Gunakan template di `deployment/ec2-be/.env.example`, lalu simpan menjadi `.env` di folder yang sama.

Contoh isi `.env` backend:

```env
DB_HOST=dbdifie.cgxgc8wsgidd.us-east-1.rds.amazonaws.com
DB_PORT=3306
DB_USER=admin
DB_PASSWORD=replace-with-rds-password
DB_NAME=dbdifie
DB_CONNECT_TIMEOUT=10000
DB_SSL=false
DB_SSL_REJECT_UNAUTHORIZED=true

PORT=8080
JWT_SECRET=replace-with-strong-secret
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://98.80.187.179

AWS_ACCESS_KEY_ID=replace-with-aws-access-key
AWS_SECRET_ACCESS_KEY=replace-with-aws-secret
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=bucket-difie
```

### 2. Nginx Reverse Proxy di Frontend Server

Konfigurasi reverse proxy ada di `deployment/ec2-fe/nginx.conf`:

- request `/api` diteruskan ke `http://10.20.2.77:8080`
- request selain `/api` diteruskan ke container frontend Next.js

Compose frontend production ada di `deployment/ec2-fe/docker-compose.yml` (service `frontend` + `nginx`).

### 3. Akses Backend Private via Bastion (Frontend EC2)

#### Opsi A - langsung dari laptop dengan ProxyJump

```bash
ssh -i keydifie.pem -J ubuntu@98.80.187.179 ubuntu@10.20.2.77
```

#### Opsi B - dua langkah (masuk FE dulu, lalu ke BE)

1. Masuk ke frontend/bastion:

```bash
ssh -i keydifie.pem ubuntu@98.80.187.179
```

2. Dari bastion, lanjut ke backend private:

```bash
ssh ubuntu@10.20.2.77
```

### 4. Install Docker + Docker Compose di EC2 (Ubuntu)

Jalankan di masing-masing server yang perlu Docker (minimal backend private, dan frontend public):

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
newgrp docker
docker --version
docker compose version
```

### 5. Deploy Backend Via Bastion di GitHub Actions

Workflow `deploy-be` menggunakan SSH jump host:

- target host backend private dari secret `EC2_BE_HOST` (contoh: `10.20.2.77`)
- bastion host dari secret `EC2_FE_HOST` (contoh: `98.80.187.179`)

Dengan ini GitHub Actions tetap bisa deploy backend private tanpa public IP.