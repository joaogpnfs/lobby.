import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateDocumentInput, DocumentDto, DocumentUpload, SignedUrl } from "@lobby/types";
import { apiFetch, apiPage } from "@/lib/api-client";

const keys = {
  all: ["documents"] as const,
  list: (query: string) => ["documents", "list", query] as const,
};

export const useDocuments = (query: string) =>
  useQuery({
    queryKey: keys.list(query),
    queryFn: () => apiPage<DocumentDto>(`/documents?${query}`),
    placeholderData: keepPreviousData,
  });

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, ...body }: Omit<CreateDocumentInput, "mimeType" | "size"> & { file: File }) => {
      const upload = await apiFetch<DocumentUpload>("/documents/presigned-url", {
        method: "POST",
        body: JSON.stringify({ ...body, mimeType: file.type, size: file.size }),
      });
      const res = await fetch(upload.uploadUrl, { method: "PUT", headers: upload.headers, body: file });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      return apiFetch<DocumentDto>(`/documents/${upload.document.id}/confirm`, { method: "POST" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<null>(`/documents/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
}

export const useDownloadDocument = () =>
  useMutation({
    mutationFn: (id: string) => apiFetch<SignedUrl>(`/documents/${id}/download-url`),
    onSuccess: ({ url }) => window.location.assign(url),
  });
