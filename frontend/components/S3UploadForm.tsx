"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { buildApiUrl } from "@/lib/api";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

type UploadResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  data?: {
    url: string;
    key: string;
    bucket: string;
  };
};

export default function S3UploadForm() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploadedKey, setUploadedKey] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSelectFile(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;

    setError(null);
    setUploadedUrl(null);
    setUploadedKey(null);
    setSelectedFile(nextFile);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      setError("Pilih file gambar terlebih dahulu.");
      return;
    }

    if (!selectedFile.type.startsWith("image/")) {
      setError("File harus berupa gambar (image).");
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setError("Ukuran file maksimal 5 MB.");
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("photo", selectedFile);

      const response = await fetch(buildApiUrl("/api/upload"), {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as UploadResponse;

      if (!response.ok || !payload?.data?.url) {
        throw new Error(payload?.error || payload?.message || "Upload gagal.");
      }

      setUploadedUrl(payload.data.url);
      setUploadedKey(payload.data.key);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload gagal.";
      setError(message);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-6 shadow-sm">
      <h2 className="text-2xl font-headline font-extrabold text-on-surface tracking-tight">
        Upload Bukti Laporan ke S3
      </h2>
      <p className="text-sm text-on-surface-variant mt-2">
        Endpoint: <span className="font-semibold">POST /api/upload</span>. Field file: <span className="font-semibold">photo</span>.
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-on-surface" htmlFor="photo">
            Foto Bukti
          </label>
          <input
            id="photo"
            name="photo"
            type="file"
            accept="image/*"
            onChange={handleSelectFile}
            className="block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:font-semibold file:text-on-primary hover:file:opacity-90"
          />
          <p className="text-xs text-on-surface-variant">Maksimum ukuran file: 5 MB.</p>
        </div>

        <button
          type="submit"
          disabled={isUploading}
          className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary disabled:opacity-70"
        >
          {isUploading ? "Uploading..." : "Upload ke S3"}
        </button>
      </form>

      {error ? <p className="mt-4 text-sm font-medium text-error">{error}</p> : null}

      {uploadedUrl ? (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-on-surface-variant">Upload berhasil. Preview dari URL publik S3:</p>
          <img
            src={uploadedUrl}
            alt="Preview bukti laporan"
            className="w-full max-w-md rounded-xl border border-outline-variant/20 object-cover"
          />
          <p className="text-xs text-on-surface-variant break-all">
            URL: <a href={uploadedUrl} target="_blank" rel="noreferrer" className="font-semibold text-primary underline">{uploadedUrl}</a>
          </p>
          {uploadedKey ? <p className="text-xs text-on-surface-variant break-all">Object key: {uploadedKey}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
