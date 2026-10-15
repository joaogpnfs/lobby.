import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import type { AuthTokens, LoginInput, Me, Permission, RegisterInput } from "@lobby/types";
import { ApiError, apiFetch, setAccessToken } from "@/lib/api-client";

// Form validation messages in Portuguese; the schemas themselves come from @lobby/types.
z.config(z.locales.ptBR());

export const meKey = ["auth", "me"] as const;

// With no token in memory (fresh tab, reload) the 401 triggers a refresh from the cookie, then retries.
export const useMe = () => useQuery({ queryKey: meKey, queryFn: () => apiFetch<Me>("/auth/me"), retry: false });

function useStartSession(path: "/auth/login" | "/auth/register") {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: LoginInput | RegisterInput) =>
      apiFetch<AuthTokens>(path, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: ({ accessToken }) => {
      setAccessToken(accessToken);
      queryClient.clear();
    },
  });
}

export const useLogin = () => useStartSession("/auth/login");
export const useRegister = () => useStartSession("/auth/register");

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<null>("/auth/logout", { method: "POST" }),
    onSettled: () => {
      setAccessToken(null);
      queryClient.clear();
    },
  });
}

export function authErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return "Não foi possível conectar. Tente de novo.";
  switch (error.code) {
    case "UNAUTHORIZED":
      return "E-mail ou senha incorretos.";
    case "CONFLICT":
      return "Já existe uma conta com este e-mail. Entre com ela.";
    case "RATE_LIMITED":
      return "Muitas tentativas seguidas. Espere um minuto e tente de novo.";
    default:
      return "Algo deu errado do nosso lado. Tente de novo em instantes.";
  }
}

// Only same-site paths, so ?next= can't send someone to another site after login.
export const safeNext = (next: unknown) =>
  typeof next === "string" && /^\/(?![/\\])/.test(next) ? next : "/dashboard";

// Hides actions the role can't take. The API still checks every request.
export function useCan() {
  const { data } = useMe();
  return (permission: Permission) => data?.permissions.includes(permission) ?? false;
}
