import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NotificationList } from "@lobby/types";
import { apiFetch } from "@/lib/api-client";

const key = ["notifications"] as const;

export const useNotifications = () =>
  useQuery({
    queryKey: key,
    queryFn: () => apiFetch<NotificationList>("/notifications"),
    refetchInterval: 60_000,
  });

export function useReadNotifications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<null>("/notifications/read", { method: "POST" }),
    onSuccess: () => queryClient.setQueryData<NotificationList>(key, (old) => old && { ...old, unread: 0 }),
  });
}
