import type { SessionUser } from "./auth";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api").replace(/\/+$/, "");

export function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const baseEndsWithApi = API_BASE_URL === "/api" || API_BASE_URL.endsWith("/api");
  const pathStartsWithApi =
    normalizedPath === "/api" || normalizedPath.startsWith("/api/");

  if (baseEndsWithApi && pathStartsWithApi) {
    return `${API_BASE_URL}${normalizedPath.slice(4)}`;
  }

  return `${API_BASE_URL}${normalizedPath}`;
}

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  error?: string;
  data?: T;
  token?: string;
  user?: SessionUser;
};

export type Category = {
  id: number;
  name: string;
  pricePerKg: number;
};

export type UserDeposit = {
  id: string;
  categoryName: string;
  estimatedWeight: number;
  actualWeight: number | null;
  pointsEarned: number;
  reportPhotoUrl: string | null;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  date: string;
  createdAt: string;
};

export type CreatedDeposit = {
  id: string;
  userId: number;
  categoryId: number;
  categoryName: string;
  estimatedWeight: number;
  actualWeight: number | null;
  pointsEarned: number;
  reportPhotoUrl: string | null;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  createdAt: string;
};

export type AdminOverview = {
  pendingDeposits: number;
  dailyActualWeightKg: number;
  dailyTonnage: number;
  pointsIssuedToday: number;
};

export type AdminQueueItem = {
  id: string;
  userName: string;
  wasteType: string;
  reportPhotoUrl: string | null;
  weight: number;
  estimatedWeight: number;
  actualWeight: number | null;
  pointsEarned: number;
  date: string;
  status: "PENDING" | "VERIFIED" | "REJECTED";
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
};

export type UploadedPhoto = {
  url: string;
  key: string;
  bucket: string;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function getUserFriendlyError(error: unknown, fallback: string) {
  const status = error instanceof ApiError ? error.status : null;
  const rawMessage = error instanceof Error ? error.message : "";
  const message = rawMessage.toLowerCase();

  if (status === 401) {
    if (
      message.includes("invalid email or password") ||
      (message.includes("email") && message.includes("password"))
    ) {
      return "Email atau password salah. Silakan coba lagi.";
    }

    if (
      message.includes("unauthorized") ||
      message.includes("missing bearer token") ||
      message.includes("invalid or expired token") ||
      message.includes("token")
    ) {
      return "Sesi login berakhir. Silakan login ulang.";
    }

    return "Autentikasi gagal. Silakan coba lagi.";
  }

  if (status === 403) {
    return "Akses ditolak. Anda tidak punya izin untuk aksi ini.";
  }

  if (status === 404) {
    return "Data yang diminta tidak ditemukan.";
  }

  if (status === 409) {
    return "Data sudah digunakan. Coba gunakan data lain.";
  }

  if (status === 422 || status === 400) {
    if (message.includes("weight")) {
      return "Berat tidak valid. Isi angka yang benar dan lebih dari 0.";
    }

    if (message.includes("photo") || message.includes("image") || message.includes("reportphotourl")) {
      return "Foto bukti wajib diunggah terlebih dahulu.";
    }

    if (message.includes("email") || message.includes("password")) {
      return "Email atau password tidak valid. Coba cek lagi.";
    }

    return "Input belum valid. Silakan cek kembali data yang diisi.";
  }

  if (
    message.includes("database") ||
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("request failed")
  ) {
    return "Layanan sedang bermasalah. Coba lagi beberapa saat.";
  }

  return rawMessage || fallback;
}

function withBearer(headers: HeadersInit | undefined, token?: string) {
  const normalized = new Headers(headers);
  normalized.set("Content-Type", "application/json");

  if (token) {
    normalized.set("Authorization", `Bearer ${token}`);
  }

  return normalized;
}

async function requestJson<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    ...options,
    headers: withBearer(options.headers, options.token),
  });

  const body = await response.text();
  let payload: ApiResponse<T> | null = null;

  if (body) {
    try {
      payload = JSON.parse(body) as ApiResponse<T>;
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const message =
      payload?.error || payload?.message || `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status);
  }

  if (payload === null) {
    throw new ApiError("Server returned an empty response", response.status);
  }

  return payload as unknown as T;
}

export const authApi = {
  login(payload: LoginPayload) {
    return requestJson<{ message: string; token: string; user: SessionUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  register(payload: RegisterPayload) {
    return requestJson<{ message: string; token: string; user: SessionUser }>(
      "/api/auth/register",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },
};

export const categoriesApi = {
  async list() {
    const response = await requestJson<{ success: true; data: Category[] }>("/api/categories");
    return response.data;
  },
};

export const uploadApi = {
  async uploadPhoto(file: File, token?: string) {
    const formData = new FormData();
    formData.append("photo", file);

    const response = await fetch(buildApiUrl("/api/upload"), {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });

    const body = await response.text();
    let payload: ApiResponse<UploadedPhoto> | null = null;

    if (body) {
      try {
        payload = JSON.parse(body) as ApiResponse<UploadedPhoto>;
      } catch {
        payload = null;
      }
    }

    if (!response.ok) {
      const message =
        payload?.error || payload?.message || `Request failed with status ${response.status}`;
      throw new ApiError(message, response.status);
    }

    if (!payload?.data?.url) {
      throw new ApiError("Server returned an invalid upload response", response.status);
    }

    return payload.data;
  },
};

export const depositsApi = {
  async create(
    token: string,
    payload: { categoryId: number; estimatedWeight: number; reportPhotoUrl?: string },
  ) {
    const response = await requestJson<{ success: true; data: CreatedDeposit }>("/api/deposits", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    });

    return response.data;
  },

  async listMine(token: string) {
    const response = await requestJson<{ success: true; data: UserDeposit[] }>(
      "/api/deposits/my",
      {
        method: "GET",
        token,
      },
    );

    return response.data;
  },
};

export const adminApi = {
  async getOverview(token: string) {
    const response = await requestJson<{ success: true; data: AdminOverview }>(
      "/api/admin/dashboard",
      {
        method: "GET",
        token,
      },
    );

    return response.data;
  },

  async getMonitoringQueue(token: string) {
    const response = await requestJson<{ success: true; data: AdminQueueItem[] }>(
      "/api/admin/monitoring-queue",
      {
        method: "GET",
        token,
      },
    );

    return response.data;
  },

  async getCategories(token: string) {
    const response = await requestJson<{ success: true; data: Category[] }>(
      "/api/admin/categories",
      {
        method: "GET",
        token,
      },
    );

    return response.data;
  },

  async approveDeposit(token: string, depositId: string, actualWeight: number) {
    const response = await requestJson<{ success: true; data: { id: string; status: string } }>(
      `/api/admin/deposits/approve/${depositId}`,
      {
        method: "PATCH",
        token,
        body: JSON.stringify({ actualWeight }),
      },
    );

    return response.data;
  },

  async rejectDeposit(token: string, depositId: string) {
    const response = await requestJson<{ success: true; data: { id: string; status: string } }>(
      `/api/admin/deposits/reject/${depositId}`,
      {
        method: "PATCH",
        token,
      },
    );

    return response.data;
  },

  async updateCategoryPrice(token: string, categoryId: number, pricePerKg: number) {
    const response = await requestJson<{
      success: true;
      data: { id: number; name: string; pricePerKg: number; updatedAt: string };
    }>(`/api/admin/categories/${categoryId}`, {
      method: "PUT",
      token,
      body: JSON.stringify({ pricePerKg }),
    });

    return response.data;
  },
};
