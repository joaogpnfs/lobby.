import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateVacationInput, VacationDto, VacationSummary } from "@lobby/types";
import { apiFetch, apiPage } from "@/lib/api-client";

const keys = {
  all: ["vacations"] as const,
  list: (query: string) => ["vacations", "list", query] as const,
  summary: ["vacations", "summary"] as const,
};

export const useVacations = (query: string) =>
  useQuery({
    queryKey: keys.list(query),
    queryFn: () => apiPage<VacationDto>(`/vacations?${query}`),
    placeholderData: keepPreviousData,
  });

export const useVacationSummary = () =>
  useQuery({ queryKey: keys.summary, queryFn: () => apiFetch<VacationSummary>("/vacations/summary") });

function useVacationMutation<V>(fn: (vars: V) => Promise<VacationDto>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
}

const post = (path: string, body: object = {}) =>
  apiFetch<VacationDto>(path, { method: "POST", body: JSON.stringify(body) });

export const useRequestVacation = () => useVacationMutation((body: CreateVacationInput) => post("/vacations", body));

export const useApproveVacation = () => useVacationMutation((id: string) => post(`/vacations/${id}/approve`));

export const useRejectVacation = () =>
  useVacationMutation(({ id, note }: { id: string; note: string }) => post(`/vacations/${id}/reject`, { note }));

export const useCancelVacation = () => useVacationMutation((id: string) => post(`/vacations/${id}/cancel`));
