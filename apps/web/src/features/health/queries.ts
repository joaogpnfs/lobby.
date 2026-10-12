import { useQuery } from "@tanstack/react-query";
import type { HealthStatus } from "@lobby/types";
import { apiFetch } from "@/lib/api-client";

export const useHealth = () => useQuery({ queryKey: ["health"], queryFn: () => apiFetch<HealthStatus>("/health") });
