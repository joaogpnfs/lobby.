import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiPage } from "@/lib/api-client";

export type CatalogResource = "departments" | "positions" | "branches";

export const useCatalog = <T>(resource: CatalogResource, query: string) =>
  useQuery({
    queryKey: [resource, query],
    queryFn: () => apiPage<T>(`/${resource}?${query}`),
    placeholderData: keepPreviousData,
  });

// For selects in forms.
// ponytail: first 100 by name; a searchable combobox when an organization outgrows that.
export const useOptions = (resource: CatalogResource | "employees") =>
  useQuery({
    queryKey: [resource, "options"],
    queryFn: () => apiPage<{ id: string; name: string }>(`/${resource}?pageSize=100`),
    select: (page) => page.items.map((i) => ({ value: i.id, label: i.name })),
  });

export function useSaveCatalog(resource: CatalogResource) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: object }) =>
      apiFetch(id ? `/${resource}/${id}` : `/${resource}`, {
        method: id ? "PATCH" : "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [resource] });
      void queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

export function useDeleteCatalog(resource: CatalogResource) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/${resource}/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [resource] }),
  });
}
