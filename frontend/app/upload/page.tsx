import Link from "next/link";
import S3UploadForm from "@/components/S3UploadForm";

export default function UploadPage() {
  return (
    <main className="page-enter min-h-screen bg-surface text-on-surface">
      <div className="max-w-4xl mx-auto px-6 py-10 md:py-14">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Kembali ke Dashboard
          </Link>
          <h1 className="mt-4 text-4xl font-headline font-black tracking-tight text-on-surface">
            Demo Upload Foto Amazon S3
          </h1>
          <p className="mt-3 text-on-surface-variant">
            Gunakan halaman ini untuk tes upload bukti laporan dari frontend Next.js ke backend Node.js.
          </p>
        </div>

        <S3UploadForm />
      </div>
    </main>
  );
}
