export type UserRole = "USER" | "ADMIN";

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  balance?: number;
};

export type AuthSession = {
  token: string;
  user: SessionUser;
};

const TOKEN_KEY = "veridian_access_token";
const USER_KEY = "veridian_user";

function canUseStorage() {
  return typeof window !== "undefined";
}

export function saveSession(session: AuthSession) {
  if (!canUseStorage()) {
    return;
  }

  localStorage.setItem(TOKEN_KEY, session.token);
  localStorage.setItem(USER_KEY, JSON.stringify(session.user));
}

export function clearSession() {
  if (!canUseStorage()) {
    return;
  }

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getToken() {
  if (!canUseStorage()) {
    return null;
  }

  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): SessionUser | null {
  if (!canUseStorage()) {
    return null;
  }

  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as SessionUser;

    if (
      typeof parsed?.id === "number" &&
      typeof parsed?.name === "string" &&
      typeof parsed?.email === "string" &&
      (parsed?.role === "USER" || parsed?.role === "ADMIN")
    ) {
      return parsed;
    }

    return null;
  } catch {
    return null;
  }
}
