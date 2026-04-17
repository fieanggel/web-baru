"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  adminApi,
  ApiError,
  getUserFriendlyError,
  type AdminOverview,
  type AdminQueueItem,
  type Category,
} from "@/lib/api";
import { clearSession, getToken, getUser, type SessionUser } from "@/lib/auth";

const navItems = [
  { label: "Overview", icon: "dashboard", href: "#overview" },
  { label: "Validate Deposits", icon: "fact_check", href: "#monitoring" },
  { label: "Price Management", icon: "payments", href: "#prices" },
  { label: "Users", icon: "group", href: "#users-info" },
  { label: "Reports", icon: "analytics", href: "#reports" },
];

function getStatusTone(status: AdminQueueItem["status"]) {
  if (status === "VERIFIED") {
    return "text-primary";
  }

  if (status === "REJECTED") {
    return "text-error";
  }

  return "text-tertiary";
}

function getStatusDot(status: AdminQueueItem["status"]) {
  if (status === "VERIFIED") {
    return "bg-primary";
  }

  if (status === "REJECTED") {
    return "bg-error";
  }

  return "bg-tertiary";
}

function getTypeTone(wasteType: string) {
  const normalized = wasteType.toLowerCase();

  if (normalized.includes("organic")) {
    return "bg-tertiary-container text-on-tertiary-container";
  }

  if (normalized.includes("hazard")) {
    return "bg-error-container text-white";
  }

  return "bg-primary-container text-on-primary-container";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function toInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "NA";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export default function AdminPage() {
  const router = useRouter();
  const [viewer, setViewer] = useState<SessionUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [queueRows, setQueueRows] = useState<AdminQueueItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [priceDrafts, setPriceDrafts] = useState<Record<number, string>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [queueActionId, setQueueActionId] = useState<string | null>(null);
  const [savingPriceId, setSavingPriceId] = useState<number | null>(null);
  const [activeNav, setActiveNav] = useState("#overview");
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const syncHash = () => {
      setActiveNav(window.location.hash || "#overview");
    };

    syncHash();
    window.addEventListener("hashchange", syncHash);

    return () => {
      window.removeEventListener("hashchange", syncHash);
    };
  }, []);

  useEffect(() => {
    const sessionToken = getToken();
    const sessionUser = getUser();

    if (!sessionToken || !sessionUser) {
      router.replace("/login");
      return;
    }

    if (sessionUser.role !== "ADMIN") {
      router.replace("/dashboard");
      return;
    }

    const accessToken = sessionToken;

    setViewer(sessionUser);
    setToken(accessToken);

    let active = true;

    async function loadAdminDashboard() {
      try {
        setError(null);
        const [overviewData, queueData, categoriesData] = await Promise.all([
          adminApi.getOverview(accessToken),
          adminApi.getMonitoringQueue(accessToken),
          adminApi.getCategories(accessToken),
        ]);

        if (!active) {
          return;
        }

        setOverview(overviewData);
        setQueueRows(queueData);
        setCategories(categoriesData);
        setPriceDrafts(
          Object.fromEntries(categoriesData.map((category) => [category.id, String(category.pricePerKg)])),
        );
      } catch (err) {
        if (!active) {
          return;
        }

        if (err instanceof ApiError && err.status === 401) {
          clearSession();
          router.replace("/login");
          return;
        }

        setError(getUserFriendlyError(err, "Tidak bisa memuat dashboard admin saat ini."));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadAdminDashboard();

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timer = window.setTimeout(() => {
      setNotice(null);
    }, 4500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [notice]);

  const filteredQueue = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) {
      return queueRows;
    }

    return queueRows.filter((row) => {
      return (
        row.userName.toLowerCase().includes(term) ||
        row.wasteType.toLowerCase().includes(term) ||
        row.status.toLowerCase().includes(term)
      );
    });
  }, [queueRows, searchTerm]);

  const maxCategoryPrice = useMemo(() => {
    return Math.max(1, ...categories.map((category) => category.pricePerKg));
  }, [categories]);

  async function refreshQueueAndOverview(currentToken: string) {
    const [overviewData, queueData] = await Promise.all([
      adminApi.getOverview(currentToken),
      adminApi.getMonitoringQueue(currentToken),
    ]);

    setOverview(overviewData);
    setQueueRows(queueData);
  }

  async function handleApprove(row: AdminQueueItem) {
    if (!token) {
      setError("Sesi login berakhir. Silakan login ulang.");
      return;
    }

    const proposed = window.prompt(
      `Masukkan actual weight untuk deposit ${row.id}`,
      String(row.estimatedWeight),
    );

    if (proposed === null) {
      return;
    }

    const parsedWeight = Number(proposed);
    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
      setError("Actual weight harus berupa angka positif.");
      return;
    }

    setQueueActionId(row.id);
    setError(null);
    setNotice(null);

    try {
      await adminApi.approveDeposit(token, row.id, parsedWeight);
      await refreshQueueAndOverview(token);
      setNotice(`Deposit ${row.id} berhasil di-approve.`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }

      setError(getUserFriendlyError(err, "Tidak bisa approve deposit saat ini."));
    } finally {
      setQueueActionId(null);
    }
  }

  async function handleReject(row: AdminQueueItem) {
    if (!token) {
      setError("Sesi login berakhir. Silakan login ulang.");
      return;
    }

    const confirmReject = window.confirm(`Reject deposit ${row.id}?`);
    if (!confirmReject) {
      return;
    }

    setQueueActionId(row.id);
    setError(null);
    setNotice(null);

    try {
      await adminApi.rejectDeposit(token, row.id);
      await refreshQueueAndOverview(token);
      setNotice(`Deposit ${row.id} berhasil di-reject.`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }

      setError(getUserFriendlyError(err, "Tidak bisa reject deposit saat ini."));
    } finally {
      setQueueActionId(null);
    }
  }

  async function handleSavePrice(categoryId: number) {
    if (!token) {
      setError("Sesi login berakhir. Silakan login ulang.");
      return;
    }

    const draft = priceDrafts[categoryId];
    const parsedPrice = Number(draft);

    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setError("Harga kategori harus angka 0 atau lebih.");
      return;
    }

    setSavingPriceId(categoryId);
    setError(null);
    setNotice(null);

    try {
      await adminApi.updateCategoryPrice(token, categoryId, parsedPrice);
      const latestCategories = await adminApi.getCategories(token);
      setCategories(latestCategories);
      setPriceDrafts(
        Object.fromEntries(latestCategories.map((category) => [category.id, String(category.pricePerKg)])),
      );
      setNotice("Harga kategori berhasil diperbarui.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }

      setError(getUserFriendlyError(err, "Tidak bisa update harga kategori saat ini."));
    } finally {
      setSavingPriceId(null);
    }
  }

  function handleLogout() {
    clearSession();
    router.push("/login");
    router.refresh();
  }

  function renderSidebar() {
    return (
      <>
        <div className="mb-10 px-4 pt-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                eco
              </span>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-green-900 dark:text-green-100 font-headline">
                EcoNexa by Difie Anggely 152023186
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                Digital Ecologist Framework
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-grow space-y-1">
          {navItems.map((item) => {
            const isActive = activeNav === item.href || (activeNav === "" && item.href === "#overview");

            return (
              <a
                key={item.label}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                  isActive
                    ? "bg-white dark:bg-slate-800 text-green-800 dark:text-green-400 font-bold shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-green-700 dark:hover:text-green-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
                href={item.href}
                onClick={() => {
                  setActiveNav(item.href);
                  setSidebarOpen(false);
                }}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span className="font-label">{item.label}</span>
              </a>
            );
          })}
        </nav>

        <div className="mt-auto space-y-1 pt-6 border-t border-slate-200/50">
          <a
            className="w-full mb-4 py-3 px-4 bg-primary text-on-primary rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all"
            href="#reports"
            onClick={() => {
              setActiveNav("#reports");
              setSidebarOpen(false);
            }}
          >
            <span className="material-symbols-outlined text-sm">add</span>
            New Report
          </a>
          <button
            className="flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-200 rounded-xl w-full"
            onClick={() => {
              setNotice("Panel settings admin akan segera tersedia.");
              setSidebarOpen(false);
            }}
            type="button"
          >
            <span className="material-symbols-outlined">settings</span>
            <span className="font-label text-sm">Settings</span>
          </button>
          <button
            className="flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-200 rounded-xl w-full"
            onClick={handleLogout}
            type="button"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="font-label text-sm">Logout</span>
          </button>
        </div>
      </>
    );
  }

  return (
    <div className="page-enter min-h-screen bg-surface text-on-surface">
      <aside className="hidden lg:flex h-screen w-64 fixed left-0 top-0 overflow-y-auto bg-slate-50 dark:bg-slate-900 flex-col p-4 z-50 border-r border-outline-variant/20 reveal-left">
        {renderSidebar()}
      </aside>

      {isSidebarOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close sidebar overlay"
            className="absolute inset-0 bg-black/35"
            onClick={() => setSidebarOpen(false)}
            type="button"
          ></button>
          <aside className="relative h-full w-72 max-w-[85vw] overflow-y-auto bg-slate-50 p-4 border-r border-outline-variant/20 shadow-2xl reveal-left">
            {renderSidebar()}
          </aside>
        </div>
      ) : null}

      <header className="fixed top-0 right-0 w-full lg:w-[calc(100%-16rem)] h-16 z-40 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-b border-outline-variant/15 reveal-up">
        <div className="h-full px-4 md:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <button
              className="lg:hidden p-2 rounded-lg bg-surface-container-low text-slate-700"
              onClick={() => setSidebarOpen(true)}
              type="button"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                search
              </span>
              <input
                className="w-full pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-full text-sm focus:ring-2 focus:ring-primary/20 placeholder:text-slate-400"
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search system logs or users..."
                type="text"
                value={searchTerm}
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <button className="hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full p-2 transition-all" type="button">
                <span className="material-symbols-outlined text-slate-600">notifications</span>
              </button>
            </div>
            <div className="h-8 w-px bg-slate-200"></div>
            <div className="flex items-center gap-3 group cursor-pointer">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-on-surface leading-none">{viewer?.name ?? "Admin Profile"}</p>
                <p className="text-[10px] text-slate-500">{viewer?.email ?? "Super Administrator"}</p>
              </div>
              <img
                alt="Admin User Profile"
                className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/10 group-hover:ring-primary/30 transition-all"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCfP9RodDLWRpmnj7vXwctH69JYF-ZNWJTETtzE1g2qCGWDtLIDEwBMva-z-OabC_jZnr6lE0Lw5LEF37UdC2ujDwp6L2t3BhKaI7opcSIjpUyPiNhIC3OELERzDKiZw1y-iK0i4-ga_bjRVO0nHN0s6ummT-6BzdhAmEHMbW4prq5VYh-T1JlzRE74V43uDLDrQZ8Z6Fe3NqoeOv4cpfBe13JEwFWRNG0r9TqHPwCTSWqVwNkCdIgpa3OZTrih6RWpAwn0onYFudJK"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="lg:ml-64 pt-24 p-4 md:p-8 min-h-screen reveal-right">
        {error ? (
          <div className="mb-6 bg-error-container text-white px-4 py-3 rounded-xl text-sm font-medium reveal-up">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">warning</span>
                <span>{error}</span>
              </div>
              <button className="opacity-80 hover:opacity-100" onClick={() => setError(null)} type="button">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
          </div>
        ) : null}

        {notice ? (
          <div className="mb-6 bg-secondary-container text-on-secondary-container px-4 py-3 rounded-xl text-sm font-medium reveal-up">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">check_circle</span>
                <span>{notice}</span>
              </div>
              <button className="opacity-80 hover:opacity-100" onClick={() => setNotice(null)} type="button">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 scroll-mt-24" id="overview">
          <div className="bg-surface-container-lowest p-6 rounded-xl relative overflow-hidden group shadow-sm card-hover reveal-up">
            <div className="relative z-10">
              <p className="text-sm font-semibold text-secondary font-label">Total Pending Deposits</p>
              <h3 className="text-4xl font-extrabold text-on-surface font-headline mt-1">
                {overview?.pendingDeposits ?? 0}
              </h3>
              <div className="mt-4 flex items-center gap-2 text-primary font-bold text-xs">
                <span className="material-symbols-outlined text-sm">trending_up</span>
                <span>{loading ? "Loading..." : "Live value"}</span>
              </div>
            </div>
            <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-8xl text-primary/5 select-none transition-transform group-hover:scale-110">
              pending_actions
            </span>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-xl relative overflow-hidden group shadow-sm card-hover reveal-up delay-1">
            <div className="relative z-10">
              <p className="text-sm font-semibold text-secondary font-label">Daily Tonnage</p>
              <h3 className="text-4xl font-extrabold text-on-surface font-headline mt-1">
                {(overview?.dailyTonnage ?? 0).toFixed(2)}
                <span className="text-lg font-medium opacity-60"> tons</span>
              </h3>
              <div className="mt-4 flex items-center gap-2 text-primary font-bold text-xs">
                <span className="material-symbols-outlined text-sm">verified</span>
                <span>Real-time aggregation</span>
              </div>
            </div>
            <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-8xl text-primary/5 select-none transition-transform group-hover:scale-110">
              scale
            </span>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-xl relative overflow-hidden group shadow-sm card-hover reveal-up delay-2">
            <div className="relative z-10">
              <p className="text-sm font-semibold text-secondary font-label">Points Issued Today</p>
              <h3 className="text-4xl font-extrabold text-on-surface font-headline mt-1">
                {(overview?.pointsIssuedToday ?? 0).toLocaleString("id-ID")}
              </h3>
              <div className="mt-4 flex items-center gap-2 text-tertiary font-bold text-xs">
                <span className="material-symbols-outlined text-sm">toll</span>
                <span>Eco-Credits allocated</span>
              </div>
            </div>
            <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-8xl text-tertiary/5 select-none transition-transform group-hover:scale-110">
              stars
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <section className="lg:col-span-8 bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm scroll-mt-24 card-hover reveal-up" id="monitoring">
            <div className="p-6 border-b border-surface-container flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold font-headline text-on-surface">Monitoring Queue</h2>
                <p className="text-sm text-slate-500 font-body">Manage and verify incoming waste deposits</p>
              </div>
              <span className="text-xs font-bold text-primary">{filteredQueue.length} rows</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[920px]">
                <thead>
                  <tr className="bg-surface-container-low text-secondary text-[11px] uppercase tracking-wider font-bold">
                    <th className="px-6 py-4">User Name</th>
                    <th className="px-6 py-4">Waste Type</th>
                    <th className="px-6 py-4">Photo</th>
                    <th className="px-6 py-4">Weight (Kg)</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-low">
                  {filteredQueue.map((row) => {
                    const pending = row.status === "PENDING";
                    const busy = queueActionId === row.id;

                    return (
                      <tr key={row.id} className={`hover:bg-slate-50 transition-colors group ${!pending ? "opacity-80" : ""}`}>
                        <td className="px-6 py-4 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold">
                            {toInitials(row.userName)}
                          </div>
                          <span className="text-sm font-semibold">{row.userName}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 ${getTypeTone(row.wasteType)} text-[10px] font-bold rounded-full`}>
                            {row.wasteType}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {row.reportPhotoUrl ? (
                            <a
                              className="inline-flex items-center gap-2"
                              href={row.reportPhotoUrl}
                              rel="noreferrer"
                              target="_blank"
                              title={`Open photo for deposit ${row.id}`}
                            >
                              <img
                                alt={`Report photo ${row.id}`}
                                className="h-14 w-14 rounded-lg border border-outline-variant/20 object-cover"
                                src={row.reportPhotoUrl}
                              />
                            </a>
                          ) : (
                            <span className="text-[11px] font-medium text-slate-400">No photo</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium">{row.weight.toFixed(1)} kg</td>
                        <td className="px-6 py-4 text-sm text-slate-500">{row.date}</td>
                        <td className="px-6 py-4">
                          <div className={`flex items-center gap-1.5 ${getStatusTone(row.status)} font-bold text-[10px]`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${getStatusDot(row.status)}`}></div>
                            {row.status}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          {pending ? (
                            <>
                              <button
                                className="bg-primary text-on-primary px-3 py-1.5 rounded-lg text-[10px] font-bold hover:shadow-lg transition-all active:scale-95 disabled:opacity-60"
                                disabled={busy}
                                onClick={() => void handleApprove(row)}
                                type="button"
                              >
                                {busy ? "Processing..." : "Approve"}
                              </button>
                              <button
                                className="bg-surface-container-high text-on-surface px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-error-container hover:text-white transition-all active:scale-95 disabled:opacity-60"
                                disabled={busy}
                                onClick={() => void handleReject(row)}
                                type="button"
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <span className="material-symbols-outlined text-slate-300">check_circle</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-surface-container-low flex justify-center">
              <button className="text-xs font-bold text-secondary-dim hover:text-primary transition-colors" type="button">
                Load more entries...
              </button>
            </div>
          </section>

          <div className="lg:col-span-4 space-y-6">
            <section className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm scroll-mt-24 card-hover reveal-up delay-1" id="prices">
              <div className="p-6 border-b border-surface-container flex items-center justify-between">
                <h2 className="text-lg font-bold font-headline text-on-surface">Price Management</h2>
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  payments
                </span>
              </div>
              <div className="p-6 space-y-4">
                {categories.map((category) => {
                  const barWidth = Math.max(8, Math.round((category.pricePerKg / maxCategoryPrice) * 100));
                  const draftValue = priceDrafts[category.id] ?? String(category.pricePerKg);
                  const busy = savingPriceId === category.id;

                  return (
                    <div key={category.id} className="p-4 bg-surface-container-low rounded-xl group hover:bg-surface-container-high transition-all cursor-pointer">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-primary-dim">
                          {category.name}
                        </span>
                        <span className="material-symbols-outlined text-lg text-slate-400 group-hover:text-primary transition-colors">
                          edit_note
                        </span>
                      </div>

                      <div className="flex items-baseline gap-1 mb-3">
                        <span className="text-2xl font-black font-headline text-on-surface">
                          {formatCurrency(category.pricePerKg)}
                        </span>
                        <span className="text-xs text-slate-500">/ kg</span>
                      </div>

                      <div className="mt-3 flex items-center gap-2 mb-3">
                        <div className="h-1 flex-grow bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${barWidth}%` }}></div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500">Market Avg</span>
                      </div>

                      <div className="flex gap-2">
                        <input
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium"
                          onChange={(event) =>
                            setPriceDrafts((prev) => ({
                              ...prev,
                              [category.id]: event.target.value,
                            }))
                          }
                          type="number"
                          value={draftValue}
                        />
                        <button
                          className="px-3 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-60"
                          disabled={busy}
                          onClick={() => void handleSavePrice(category.id)}
                          type="button"
                        >
                          {busy ? "Saving" : "Save"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="bg-primary p-6 rounded-xl text-on-primary relative overflow-hidden scroll-mt-24 card-hover reveal-up delay-2" id="reports">
              <div className="relative z-10">
                <h4 className="font-headline font-bold text-lg leading-tight mb-1">Monthly Recycling Goal</h4>
                <p className="text-xs opacity-80 mb-4">Current progress toward net-zero waste.</p>
                <div className="flex items-center justify-center py-4">
                  <div className="relative w-24 h-24">
                    <svg className="w-full h-full -rotate-90">
                      <circle className="opacity-20" cx="48" cy="48" fill="transparent" r="40" stroke="currentColor" strokeWidth="8"></circle>
                      <circle cx="48" cy="48" fill="transparent" r="40" stroke="#9df197" strokeDasharray="251.2" strokeDashoffset="62.8" strokeLinecap="round" strokeWidth="8"></circle>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl font-black">75%</span>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-center font-bold uppercase tracking-widest opacity-90 mt-2">
                  {(overview?.dailyActualWeightKg ?? 0).toFixed(1)} kg verified today
                </p>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            </section>

            <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-5 scroll-mt-24 card-hover reveal-up delay-3" id="users-info">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-primary text-lg">group</span>
                <h3 className="text-sm font-bold">Admin User</h3>
              </div>
              <p className="text-sm text-on-surface">
                {viewer?.name ?? "-"}
              </p>
              <p className="text-xs text-slate-500">{viewer?.email ?? "-"}</p>
              <div className="mt-4 text-center text-xs text-slate-500">
                <Link className="text-primary font-bold hover:underline" href="/dashboard">
                  Open User Dashboard
                </Link>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
