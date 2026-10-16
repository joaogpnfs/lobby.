import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateEmployeeInput,
  EmployeeDto,
  EmployeeListItem,
  TerminateEmployeeInput,
  UpdateEmployeeInput,
} from "@lobby/types";
import { apiFetch, apiPage } from "@/lib/api-client";

const keys = {
  all: ["employees"] as const,
  list: (query: string) => ["employees", "list", query] as const,
  detail: (id: string) => ["employees", "detail", id] as const,
};

export const useEmployees = (query: string) =>
  useQuery({
    queryKey: keys.list(query),
    queryFn: () => apiPage<EmployeeListItem>(`/employees?${query}`),
    placeholderData: keepPreviousData,
  });

export const useEmployee = (id: string) =>
  useQuery({ queryKey: keys.detail(id), queryFn: () => apiFetch<EmployeeDto>(`/employees/${id}`) });

function useEmployeeMutation<V>(fn: (vars: V) => Promise<EmployeeDto | null>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.all });
      for (const resource of ["departments", "positions", "branches"]) {
        void queryClient.invalidateQueries({ queryKey: [resource] });
      }
    },
  });
}

const json = (method: string, body?: object) => ({ method, body: body && JSON.stringify(body) });

export const useCreateEmployee = () =>
  useEmployeeMutation((body: CreateEmployeeInput) => apiFetch<EmployeeDto>("/employees", json("POST", body)));

export const useUpdateEmployee = (id: string) =>
  useEmployeeMutation((body: UpdateEmployeeInput) => apiFetch<EmployeeDto>(`/employees/${id}`, json("PATCH", body)));

export const useTerminateEmployee = (id: string) =>
  useEmployeeMutation((body: TerminateEmployeeInput) =>
    apiFetch<EmployeeDto>(`/employees/${id}/terminate`, json("POST", body)),
  );

export const useDeleteEmployee = (id: string) =>
  useEmployeeMutation(() => apiFetch<null>(`/employees/${id}`, json("DELETE")));
