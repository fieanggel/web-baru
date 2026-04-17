"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  ApiError,
  categoriesApi,
  depositsApi,
  getUserFriendlyError,
  type Category,
  type UserDeposit,
  uploadApi,
} from "@/lib/api";
import { clearSession, getToken, getUser, type SessionUser } from "@/lib/auth";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const IMAGE_COMPRESSION_THRESHOLD_BYTES = 1.5 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

const ROUTES = {
  dashboard: "/dashboard",
  deposit: "#deposits",
  history: "#history",
  settings: "#settings",
  login: "/login",
};

const navItems = [
  {
    label: "Dashboard",
    icon: "dashboard",
    href: ROUTES.dashboard,
    active: true,
  },
  {
    label: "Deposits",
    icon: "eco",
    href: ROUTES.deposit,
    active: false,
  },
  {
    label: "History",
    icon: "history",
    href: ROUTES.history,
    active: false,
  },
  {
    label: "Settings",
    icon: "settings",
    href: ROUTES.settings,
    active: false,
  },
];

function getCategoryIcon(name: string) {
  const normalized = name.toLowerCase();

  if (normalized.includes("plastic") || normalized.includes("recyclable")) {
    return "package_2";
  }

  if (normalized.includes("paper")) {
    return "article";
  }

  if (normalized.includes("organic")) {
    return "compost";
  }

  if (normalized.includes("glass") || normalized.includes("aluminum")) {
    return "wine_bar";
  }

  if (normalized.includes("hazard")) {
    return "dangerous";
  }

  return "recycling";
}

function formatWeight(value: number | null) {
  if (value === null) {
    return "-";
  }

  return `${value.toFixed(1)} Kg`;
}

function getStatusTone(status: UserDeposit["status"]) {
  if (status === "VERIFIED") {
    return "bg-secondary-container text-on-secondary-container";
  }

  if (status === "REJECTED") {
    return "bg-error-container text-white";
  }

  return "bg-surface-container-high text-on-surface-variant";
}

function getStatusLabel(status: UserDeposit["status"]) {
  if (status === "VERIFIED") {
    return "Verified";
  }

  if (status === "REJECTED") {
    return "Rejected";
  }

  return "Pending";
}

function loadImageFromFile(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image"));
    };

    image.src = objectUrl;
  });
}

async function compressImageIfNeeded(file: File) {
  if (!file.type.startsWith("image/") || file.size <= IMAGE_COMPRESSION_THRESHOLD_BYTES) {
    return file;
  }

  try {
    const image = await loadImageFromFile(file);
    const ratio = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * ratio));
    const height = Math.max(1, Math.round(image.height * ratio));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return file;
    }

    ctx.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY);
    });

    if (!blob || blob.size >= file.size) {
      return file;
    }

    const fileName = `${file.name.replace(/\.[^.]+$/, "")}.jpg`;
    return new File([blob], fileName, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [viewer, setViewer] = useState<SessionUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [deposits, setDeposits] = useState<UserDeposit[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [estimatedWeight, setEstimatedWeight] = useState<string>("");
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    const sessionToken = getToken();
    const sessionUser = getUser();

    if (!sessionToken || !sessionUser) {
      router.replace(ROUTES.login);
      return;
    }

    if (sessionUser.role !== "USER") {
      router.replace("/admin");
      return;
    }

    const accessToken = sessionToken;

    setViewer(sessionUser);
    setToken(accessToken);

    let active = true;

    async function loadDashboard() {
      try {
        setError(null);
        const [fetchedCategories, fetchedDeposits] = await Promise.all([
          categoriesApi.list(),
          depositsApi.listMine(accessToken),
        ]);

        if (!active) {
          return;
        }

        setCategories(fetchedCategories);
        setDeposits(fetchedDeposits);
        setSelectedCategoryId((prev) => prev ?? fetchedCategories[0]?.id ?? null);
      } catch (err) {
        if (!active) {
          return;
        }

        if (err instanceof ApiError && err.status === 401) {
          clearSession();
          router.replace(ROUTES.login);
          return;
        }

        setError(getUserFriendlyError(err, "Tidak bisa memuat dashboard saat ini."));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (!selectedPhoto) {
      setPhotoPreviewUrl(null);
      return;
    }

    const previewUrl = URL.createObjectURL(selectedPhoto);
    setPhotoPreviewUrl(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [selectedPhoto]);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  );

  const estimatedReward = useMemo(() => {
    const weight = Number(estimatedWeight);

    if (!selectedCategory || !Number.isFinite(weight) || weight <= 0) {
      return 0;
    }

    return Math.round(weight * selectedCategory.pricePerKg);
  }, [estimatedWeight, selectedCategory]);

  const totalPoints = useMemo(
    () => deposits.reduce((sum, item) => sum + item.pointsEarned, 0),
    [deposits],
  );

  const totalWasteKg = useMemo(
    () => deposits.reduce((sum, item) => sum + (item.actualWeight ?? item.estimatedWeight), 0),
    [deposits],
  );

  const verifiedProgress = useMemo(() => {
    if (!deposits.length) {
      return 0;
    }

    const verified = deposits.filter((item) => item.status === "VERIFIED").length;
    return Math.round((verified / deposits.length) * 100);
  }, [deposits]);

  const monthlyBars = useMemo(() => {
    const monthMap = new Map<string, { label: string; weight: number }>();
    const now = new Date();

    for (let i = 5; i >= 0; i -= 1) {
      const date = new Date(now);
      date.setMonth(now.getMonth() - i);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      monthMap.set(key, {
        label: date.toLocaleString("en-US", { month: "short" }),
        weight: 0,
      });
    }

    deposits.forEach((deposit) => {
      const date = new Date(deposit.createdAt);
      if (Number.isNaN(date.getTime())) {
        return;
      }

      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const current = monthMap.get(key);

      if (current) {
        current.weight += deposit.actualWeight ?? deposit.estimatedWeight;
      }
    });

    const list = Array.from(monthMap.values());
    const maxWeight = Math.max(1, ...list.map((item) => item.weight));

    return list.map((item) => ({
      ...item,
      height: Math.max(10, Math.round((item.weight / maxWeight) * 100)),
    }));
  }, [deposits]);

  async function refreshDeposits(currentToken: string) {
    const latestDeposits = await depositsApi.listMine(currentToken);
    setDeposits(latestDeposits);
  }

  function handleSelectPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setError(null);
    setSubmitMessage(null);

    if (!file) {
      setSelectedPhoto(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setSelectedPhoto(null);
      event.target.value = "";
      setError("Foto harus berupa file gambar (image).");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setSelectedPhoto(null);
      event.target.value = "";
      setError("Ukuran foto maksimal 5 MB.");
      return;
    }

    setSelectedPhoto(file);
  }

  async function handleCreateDeposit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitMessage(null);

    if (!token) {
      setError("Session expired. Please login again.");
      return;
    }

    if (!selectedCategoryId) {
      setError("Please select a category first.");
      return;
    }

    const parsedWeight = Number(estimatedWeight);
    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
      setError("Weight must be a positive number.");
      return;
    }

    if (!selectedPhoto) {
      setError("Foto bukti wajib diunggah sebelum submit.");
      return;
    }

    setSubmitting(true);

    try {
      setUploadingPhoto(true);
      const fileForUpload = await compressImageIfNeeded(selectedPhoto);
      const uploadedPhoto = await uploadApi.uploadPhoto(fileForUpload, token);

      await depositsApi.create(token, {
        categoryId: selectedCategoryId,
        estimatedWeight: parsedWeight,
        reportPhotoUrl: uploadedPhoto.url,
      });

      await refreshDeposits(token);
      setEstimatedWeight("");
      setSelectedPhoto(null);

      if (photoInputRef.current) {
        photoInputRef.current.value = "";
      }

      setSubmitMessage("Deposit berhasil dikirim. Menunggu verifikasi admin.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearSession();
        router.replace(ROUTES.login);
        return;
      }

      setError(getUserFriendlyError(err, "Tidak bisa mengirim deposit saat ini."));
    } finally {
      setUploadingPhoto(false);
      setSubmitting(false);
    }
  }

  function handleLogout() {
    clearSession();
    router.push(ROUTES.login);
    router.refresh();
  }

  return (
    <div className="page-enter min-h-screen bg-surface text-on-surface">
      <aside className="hidden lg:block bg-slate-50 h-screen w-64 fixed left-0 top-0 overflow-y-auto shadow-none z-50 reveal-left">
        <div className="flex flex-col h-full p-4 space-y-2">
          <div className="px-4 py-6 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center">
                <span
                  className="material-symbols-outlined text-on-primary-container"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  eco
                </span>
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tighter text-green-900 dark:text-green-200">
                  EcoNexa by Difie Anggely 152023186
                </h1>
                <p className="text-[10px] uppercase tracking-widest text-primary opacity-70 font-bold">
                  Sustainable Intelligence
                </p>
              </div>
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.label}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                  item.active
                    ? "text-green-700 bg-white shadow-sm font-bold"
                    : "text-slate-500 hover:bg-green-50 hover:text-green-700"
                }`}
                href={item.href}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span className="font-manrope text-sm font-semibold tracking-tight">
                  {item.label}
                </span>
              </Link>
            ))}
          </nav>

          <div className="flex-grow"></div>

          <Link
            className="block text-center w-full bg-primary text-on-primary py-3 rounded-xl font-manrope font-bold text-sm mb-4 shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity"
            href={ROUTES.deposit}
          >
            Go to Deposit Form
          </Link>

          <div className="border-t border-slate-200 pt-4 space-y-1">
            <button
              className="flex items-center gap-3 px-4 py-2 text-slate-500 hover:text-green-700 transition-colors text-sm font-medium w-full"
              type="button"
            >
              <span className="material-symbols-outlined text-lg">help</span>
              <span>Help</span>
            </button>
            <button
              className="flex items-center gap-3 px-4 py-2 text-slate-500 hover:text-red-600 transition-colors text-sm font-medium w-full"
              onClick={handleLogout}
              type="button"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      <header className="fixed top-0 right-0 w-full lg:w-[calc(100%-16rem)] h-16 z-40 bg-white/80 backdrop-blur-xl border-none reveal-up">
        <div className="flex items-center justify-between px-4 md:px-8 w-full h-full gap-4">
          <div className="flex items-center gap-3 w-full lg:w-1/3">
            <button className="lg:hidden p-2 rounded-lg bg-surface-container" type="button">
              <span className="material-symbols-outlined text-on-surface">menu</span>
            </button>
            <div className="relative w-full max-w-xs">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm">
                search
              </span>
              <input
                className="w-full bg-surface-container-low border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary"
                placeholder="Search insights..."
                type="text"
              />
            </div>
          </div>

          <div className="hidden md:block text-lg font-black text-green-900 font-manrope">
            EcoNexa by Difie Anggely 152023186
          </div>

          <div className="flex items-center gap-4 md:gap-6 w-auto lg:w-1/3 justify-end">
            <button
              className="relative text-slate-400 hover:text-green-600 transition-opacity"
              type="button"
            >
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full border-2 border-white"></span>
            </button>
            <div className="flex items-center gap-3 pl-3 md:pl-4 border-l border-slate-200">
              <div className="hidden sm:block text-right">
                <p className="text-xs font-bold text-on-surface">
                  {viewer?.name ?? "EcoNexa Member"}
                </p>
                <p className="text-[10px] text-primary font-semibold">{viewer?.email ?? "-"}</p>
              </div>
              <img
                alt="User profile"
                className="w-9 h-9 rounded-full bg-slate-200"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDIiSU5_A3UvY1eaZEB7F6PpsqbKjLo7tMrNWVILPRqhcPyLo1SZaVcYBEJm5UjFf4SrPHKVpx1fWw0XpJYXy_UpGC_ch6fyOAiYq--DM0q7H9D7hM111TqgURr6hCiRIO3FPtdeS1bN5EI6NTpzVovxXzDNZazEO2O04vAxqjWAAJXpXdmE8ljUrq5RtjUrmetwMCTyxZDa5r_9L2zSVHWXIhaEFSGMlIpzpYydzGiDR0DnqpvGBAi_WRhha8u80UeBE1rRsvPmrdz"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="lg:ml-64 pt-16 min-h-screen reveal-right">
        <div className="p-4 md:p-8 space-y-8">
          {error ? (
            <div className="bg-error-container text-white px-4 py-3 rounded-xl text-sm font-medium reveal-up">
              {error}
            </div>
          ) : null}

          {submitMessage ? (
            <div className="bg-secondary-container text-on-secondary-container px-4 py-3 rounded-xl text-sm font-medium reveal-up">
              {submitMessage}
            </div>
          ) : null}

          <section className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-stretch reveal-up">
            <div className="xl:col-span-8 bg-surface-container-lowest rounded-[2rem] p-8 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden card-hover reveal-up">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
              <div className="relative z-10 space-y-6 flex-grow">
                <div>
                  <span className="px-4 py-1.5 bg-primary-container text-on-primary-container text-xs font-bold rounded-full uppercase tracking-wider">
                    Current Status
                  </span>
                  <h2 className="text-4xl md:text-5xl font-extrabold text-on-surface mt-4 tracking-tight font-manrope">
                    Eco-Hero Progress
                  </h2>
                  <p className="text-secondary max-w-md mt-2 text-lg">
                    Track verified deposits and keep building your sustainability score.
                  </p>
                </div>

                <div className="flex flex-wrap gap-4">
                  <Link
                    className="bg-primary text-on-primary px-8 py-4 rounded-xl font-bold flex items-center gap-2 hover:shadow-lg hover:shadow-primary/20 transition-all"
                    href={ROUTES.deposit}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      add_circle
                    </span>
                    Mulai Setor
                  </Link>
                </div>
              </div>

              <div className="relative w-48 h-48 flex-shrink-0 float-soft">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 192 192">
                  <circle
                    className="text-surface-container"
                    cx="96"
                    cy="96"
                    fill="transparent"
                    r="88"
                    stroke="currentColor"
                    strokeWidth="12"
                  ></circle>
                  <circle
                    className="text-primary"
                    cx="96"
                    cy="96"
                    fill="transparent"
                    r="88"
                    stroke="currentColor"
                    strokeDasharray="552.92"
                    strokeDashoffset={String(552.92 - (verifiedProgress / 100) * 552.92)}
                    strokeWidth="12"
                  ></circle>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-on-surface">{verifiedProgress}%</span>
                  <span className="text-[10px] font-bold text-secondary uppercase">Verified Rate</span>
                </div>
              </div>
            </div>

            <div className="xl:col-span-4 flex flex-col gap-4">
              <div className="bg-primary text-on-primary p-6 rounded-[2rem] flex-grow flex flex-col justify-between group cursor-pointer overflow-hidden relative card-hover reveal-up delay-1">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                <div className="flex justify-between items-start relative z-10">
                  <span className="material-symbols-outlined p-2 bg-white/20 rounded-lg">stars</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">
                    Redeemable
                  </span>
                </div>
                <div className="relative z-10">
                  <p className="text-4xl font-black font-manrope">{totalPoints.toLocaleString("id-ID")}</p>
                  <p className="text-sm font-semibold opacity-90">Total Points Earned</p>
                </div>
              </div>

              <div className="bg-surface-container-lowest p-6 rounded-[2rem] border border-outline-variant/10 flex-grow flex flex-col justify-between card-hover reveal-up delay-2">
                <div className="flex justify-between items-start">
                  <span className="material-symbols-outlined p-2 bg-secondary-container text-on-secondary-container rounded-lg">
                    scale
                  </span>
                  <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">
                    Life-time
                  </span>
                </div>
                <div>
                  <p className="text-4xl font-black text-on-surface font-manrope">
                    {totalWasteKg.toFixed(1)} <span className="text-lg font-medium opacity-50">Kg</span>
                  </p>
                  <p className="text-sm font-semibold text-secondary">Waste Deposited</p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-12 gap-8 reveal-up" id="deposits">
            <div className="xl:col-span-5 bg-surface-container-low rounded-[2rem] p-8 card-hover reveal-up">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-2 h-8 bg-primary rounded-full"></div>
                <h3 className="text-2xl font-bold tracking-tight font-manrope">Setor Sampah Baru</h3>
              </div>

              <form className="space-y-6" onSubmit={handleCreateDeposit}>
                <div>
                  <label className="block text-sm font-bold text-secondary mb-3 ml-1">Type of Waste</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {categories.map((category) => {
                      const selected = selectedCategoryId === category.id;

                      return (
                        <label className="cursor-pointer group" key={category.id}>
                          <input
                            checked={selected}
                            className="hidden peer"
                            name="waste_type"
                            onChange={() => setSelectedCategoryId(category.id)}
                            type="radio"
                          />
                          <div className="p-4 rounded-2xl bg-surface-container-highest border-2 border-transparent peer-checked:border-primary peer-checked:bg-primary-container/20 text-center transition-all">
                            <span className="material-symbols-outlined block mb-2 text-primary">
                              {getCategoryIcon(category.name)}
                            </span>
                            <span className="text-xs font-bold">{category.name}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-secondary mb-3 ml-1">Weight (Kg)</label>
                  <div className="relative">
                    <input
                      className="w-full bg-surface-container-highest border-none rounded-2xl p-4 text-2xl font-black focus:ring-2 focus:ring-primary text-center"
                      min="0"
                      onChange={(event) => setEstimatedWeight(event.target.value)}
                      placeholder="0.0"
                      step="0.1"
                      type="number"
                      value={estimatedWeight}
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-lg font-bold text-outline">
                      Kg
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-secondary mb-3 ml-1">
                    Foto Bukti (Wajib)
                  </label>
                  <div className="rounded-2xl border border-dashed border-outline-variant/40 bg-surface-container-highest/70 p-4">
                    <input
                      accept="image/*"
                      className="block w-full text-sm text-on-surface file:mr-4 file:rounded-xl file:border-0 file:bg-primary file:px-4 file:py-2 file:font-bold file:text-on-primary hover:file:opacity-90"
                      onChange={handleSelectPhoto}
                      ref={photoInputRef}
                      type="file"
                    />
                    <p className="mt-2 text-xs text-secondary">
                      Unggah foto sampah sebelum submit. Format gambar, maksimal 5 MB.
                    </p>
                  </div>

                  {photoPreviewUrl ? (
                    <div className="mt-3 overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface">
                      <img
                        alt="Preview foto sampah"
                        className="h-44 w-full object-cover"
                        src={photoPreviewUrl}
                      />
                    </div>
                  ) : null}
                </div>

                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-center justify-between">
                  <span className="text-sm font-semibold text-primary-dim">Estimated Reward</span>
                  <span className="text-xl font-bold text-primary font-manrope">
                    {estimatedReward.toLocaleString("id-ID")} Points
                  </span>
                </div>

                <button
                  className="block text-center w-full py-5 bg-primary text-on-primary rounded-2xl font-black tracking-tight text-lg shadow-xl shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-60"
                  disabled={submitting || uploadingPhoto || loading || !categories.length || !selectedPhoto}
                  type="submit"
                >
                  {uploadingPhoto ? "Uploading photo..." : submitting ? "Submitting..." : "Submit Deposit"}
                </button>
              </form>
            </div>

            <div className="xl:col-span-7 bg-surface-container-lowest rounded-[2rem] p-8 relative group overflow-hidden card-hover reveal-up delay-1">
              <div className="flex justify-between items-center mb-12">
                <h3 className="text-2xl font-bold tracking-tight font-manrope">Monthly Contribution</h3>
                <div className="text-xs font-bold text-secondary">
                  {loading ? "Loading..." : "Last 6 months"}
                </div>
              </div>

              <div className="h-64 flex items-end justify-between gap-2 px-2 relative">
                <div className="absolute inset-0 flex items-center justify-center opacity-10">
                  <div className="w-full border-t border-secondary-dim border-dashed"></div>
                </div>

                <div className="w-full flex items-end justify-between gap-4 h-full">
                  {monthlyBars.map((bar) => (
                    <div className="w-full rounded-t-xl bg-primary/25 relative group" key={bar.label} style={{ height: `${bar.height}%` }}>
                      <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-on-surface text-surface px-2 py-1 rounded text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {bar.weight.toFixed(1)} Kg
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between px-2 mt-6 text-[10px] font-bold text-outline uppercase tracking-widest">
                {monthlyBars.map((bar) => (
                  <span key={`${bar.label}-axis`}>{bar.label}</span>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-6 pb-12 reveal-up" id="history">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-2xl font-bold tracking-tight font-manrope">Recent Deposits</h3>
              <span className="text-primary font-bold text-sm">{deposits.length} entries</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-separate border-spacing-y-4 min-w-[860px]">
                <thead>
                  <tr className="text-outline text-[10px] font-black uppercase tracking-widest px-4">
                    <th className="pb-2 pl-8">Date</th>
                    <th className="pb-2">Waste Type</th>
                    <th className="pb-2">Weight</th>
                    <th className="pb-2">Photo</th>
                    <th className="pb-2">Points</th>
                    <th className="pb-2 text-center">Status</th>
                    <th className="pb-2 pr-8 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {deposits.map((entry) => {
                    const [datePart, timePart] = entry.date.split(",");
                    const pending = entry.status === "PENDING";

                    return (
                      <tr
                        className="bg-surface-container-lowest group hover:bg-surface-container-low transition-colors rounded-2xl overflow-hidden"
                        key={entry.id}
                      >
                        <td className="py-5 pl-8 rounded-l-2xl">
                          <p className="font-bold text-sm text-on-surface">{datePart.trim()}</p>
                          <p className="text-[10px] text-secondary">{timePart?.trim() ?? "-"}</p>
                        </td>

                        <td className="py-5">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary-container/30 text-primary">
                              <span className="material-symbols-outlined text-sm">
                                {getCategoryIcon(entry.categoryName)}
                              </span>
                            </div>
                            <span className="text-sm font-semibold">{entry.categoryName}</span>
                          </div>
                        </td>

                        <td className="py-5">
                          <span className="text-sm font-bold">
                            {formatWeight(entry.actualWeight ?? entry.estimatedWeight)}
                          </span>
                        </td>

                        <td className="py-5">
                          {entry.reportPhotoUrl ? (
                            <a
                              className="text-xs font-bold text-primary hover:underline"
                              href={entry.reportPhotoUrl}
                              rel="noreferrer"
                              target="_blank"
                            >
                              Lihat Foto
                            </a>
                          ) : (
                            <span className="text-xs text-outline">-</span>
                          )}
                        </td>

                        <td className="py-5">
                          <span className="text-sm font-bold text-primary">
                            {entry.pointsEarned.toLocaleString("id-ID")} pts
                          </span>
                        </td>

                        <td className="py-5 text-center">
                          <span
                            className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-tighter ${getStatusTone(entry.status)} ${pending ? "animate-pulse" : ""}`}
                          >
                            {getStatusLabel(entry.status)}
                          </span>
                        </td>

                        <td className="py-5 pr-8 text-right rounded-r-2xl">
                          {pending ? (
                            <span className="text-xs text-outline">Awaiting review</span>
                          ) : (
                            <Link
                              className="p-2 text-outline hover:text-primary transition-colors"
                              href={ROUTES.history}
                            >
                              <span className="material-symbols-outlined text-lg">visibility</span>
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="pb-12" id="settings">
            <div className="bg-surface-container-low rounded-[2rem] p-6 md:p-8 border border-outline-variant/20 card-hover reveal-up">
              <div className="flex items-center gap-3 mb-4">
                <span className="material-symbols-outlined text-primary">settings</span>
                <h3 className="text-2xl font-bold tracking-tight font-manrope">Settings</h3>
              </div>
              <p className="text-on-surface-variant text-sm md:text-base">
                Akun aktif: <strong>{viewer?.email ?? "-"}</strong>. Gunakan tombol logout jika ingin
                berganti akun.
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}