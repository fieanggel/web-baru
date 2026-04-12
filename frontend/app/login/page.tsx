"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authApi, getUserFriendlyError } from "@/lib/api";
import { saveSession } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData(event.currentTarget);
      const payload = {
        email: String(formData.get("email") || "").trim(),
        password: String(formData.get("password") || ""),
      };

      const data = await authApi.login(payload);

      saveSession({
        token: data.token,
        user: data.user,
      });

      router.push(data.user.role === "ADMIN" ? "/admin" : "/dashboard");
      router.refresh();
    } catch (err) {
      setError(getUserFriendlyError(err, "Login gagal. Silakan coba lagi."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page-enter h-screen overflow-hidden bg-surface text-on-surface">
      <div className="flex flex-col md:flex-row h-full">
        <section className="relative hidden md:flex md:w-1/2 h-full bg-primary overflow-hidden items-end p-12 lg:p-20 reveal-left">
          <div className="absolute inset-0 z-0">
            <img
              alt="Dense green forest canopy in morning mist"
              className="w-full h-full object-cover opacity-80 mix-blend-multiply"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDRojzn4AMs1sbqQHqfFBNumLsnkjBoFgTyYn7BkGiO6IrK9ljgPpUs5Sh0sWieGUnksUv9ytXm9Xe_s9YkayOVQNn9UJkuVEk05UlZe7cqsmsuWHjbrtSVVG_tgbNwJOmGuPlcB8Z43xT4aY1DLiQhv2a9hU-rsw3JjNE7Vt-FzpgvrEmOanX0Ctpxi33b7127R23mfcCWhneG1829sx2rgM7s_7aE3e_xAIS91eFELLclFvnSPzibWGwbHj1fFTyb7m4ERDDMJANC"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent"></div>
          </div>
          <div className="relative z-10 max-w-lg">
            <div className="mb-8">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary-container text-on-primary-container text-xs font-bold tracking-widest uppercase mb-4">
                Digital Ecology
              </span>
              <h1 className="text-4xl lg:text-6xl font-black text-on-primary tracking-tight leading-tight mb-6">
                EcoNexa by Difie Anggely 152023186
              </h1>
              <p className="text-xl lg:text-2xl text-on-primary/90 font-headline font-light leading-relaxed">
                Environmental Stewardship through Data.
              </p>
            </div>
            <div className="flex gap-8 items-center pt-8 border-t border-on-primary/20">
              <div>
                <p className="text-on-primary font-bold text-2xl tracking-tighter">1.2M</p>
                <p className="text-on-primary/70 text-xs font-label">Tons Diverted</p>
              </div>
              <div>
                <p className="text-on-primary font-bold text-2xl tracking-tighter">84%</p>
                <p className="text-on-primary/70 text-xs font-label">Recovery Rate</p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex-1 h-full flex flex-col justify-center items-center p-8 lg:p-24 bg-surface-container-lowest overflow-hidden reveal-right">
          <div className="md:hidden mb-12 text-center reveal-up">
            <h1 className="text-3xl font-black text-primary tracking-tighter">EcoNexa by Difie Anggely 152023186</h1>
            <p className="text-on-surface-variant text-sm mt-2">
              Environmental Stewardship through Data
            </p>
          </div>

          <div className="w-full max-w-md reveal-up delay-1">
            <header className="mb-10 text-center md:text-left reveal-up delay-2">
              <h2 className="text-3xl font-extrabold text-on-surface tracking-tight mb-2">
                Welcome Back
              </h2>
              <p className="text-on-surface-variant font-body">
                Enter your credentials to access the ecosystem dashboard.
              </p>
            </header>

            <form className="space-y-6 reveal-up delay-3" method="post" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-on-surface ml-1" htmlFor="email">
                  Email
                </label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
                    mail
                  </span>
                  <input
                    className="w-full pl-12 pr-4 py-4 bg-surface-container-low border-0 rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all text-on-surface placeholder:text-outline"
                    id="email"
                    name="email"
                    placeholder="name@company.com"
                    required
                    type="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-sm font-bold text-on-surface" htmlFor="password">
                    Password
                  </label>
                  <a className="text-xs font-bold text-primary hover:underline transition-all" href="#">
                    Forgot Password?
                  </a>
                </div>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
                    lock
                  </span>
                  <input
                    className="w-full pl-12 pr-4 py-4 bg-surface-container-low border-0 rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all text-on-surface placeholder:text-outline"
                    id="password"
                    name="password"
                    placeholder="••••••••"
                    required
                    type="password"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 px-1">
                <input
                  className="w-4 h-4 rounded-lg border-outline-variant text-primary focus:ring-primary/20"
                  id="remember"
                  type="checkbox"
                />
                <label className="text-sm text-on-surface-variant" htmlFor="remember">
                  Remember this device
                </label>
              </div>

              <button
                className="w-full py-4 bg-primary text-on-primary font-headline font-bold text-lg rounded-xl shadow-lg shadow-primary/10 hover:shadow-primary/20 active:scale-[0.98] transition-all flex justify-center items-center gap-2 group disabled:opacity-70"
                disabled={isSubmitting}
                type="submit"
              >
                <span>{isSubmitting ? "Signing In..." : "Sign In"}</span>
                <span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </button>

              {error ? <p className="text-sm text-error font-medium text-center reveal-up">{error}</p> : null}
            </form>

            <div className="mt-10 pt-8 border-t border-surface-container flex flex-col items-center gap-6">
              <p className="text-on-surface-variant text-sm">
                Don&apos;t have an account?
                <a className="text-primary font-bold hover:underline ml-1" href="/register">
                  Sign Up
                </a>
              </p>
              <div className="flex gap-4 w-full">
                <button className="flex-1 py-3 px-4 flex items-center justify-center gap-2 border border-outline-variant/20 rounded-xl hover:bg-surface-container-low transition-colors text-sm font-bold text-on-surface">
                  <span className="material-symbols-outlined text-lg">shield</span>
                  SSO Login
                </button>
                <button className="flex-1 py-3 px-4 flex items-center justify-center gap-2 border border-outline-variant/20 rounded-xl hover:bg-surface-container-low transition-colors text-sm font-bold text-on-surface">
                  <span className="material-symbols-outlined text-lg">help</span>
                  Support
                </button>
              </div>
            </div>
          </div>

          <footer className="mt-auto pt-12 text-center reveal-up delay-4">
            <p className="text-[10px] uppercase tracking-widest text-outline font-bold">
              © 2024 EcoNexa by Difie Anggely 152023186. Environmental Stewardship through Data.
            </p>
          </footer>
        </section>
      </div>
    </main>
  );
}
