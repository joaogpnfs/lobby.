import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AcceptInvitationInput,
  AuthTokens,
  CreatedInvitation,
  CreateInvitationInput,
  InvitationDto,
  InvitationPreview,
  MemberDto,
  UpdateMemberInput,
} from "@lobby/types";
import { apiFetch, apiPage, setAccessToken } from "@/lib/api-client";

const json = (method: string, body?: object) => ({ method, body: body && JSON.stringify(body) });

export const useMembers = () =>
  useQuery({ queryKey: ["members"], queryFn: () => apiPage<MemberDto>("/members?pageSize=100") });

export const useInvitations = () =>
  useQuery({ queryKey: ["invitations"], queryFn: () => apiFetch<InvitationDto[]>("/invitations") });

export function useInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateInvitationInput) => apiFetch<CreatedInvitation>("/invitations", json("POST", body)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invitations"] }),
  });
}

export function useRevokeInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<null>(`/invitations/${id}`, json("DELETE")),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invitations"] }),
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateMemberInput & { id: string }) =>
      apiFetch<MemberDto>(`/members/${id}`, json("PATCH", body)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["members"] }),
  });
}

// The token goes in a POST body, not the API URL, so it stays out of request logs.
export const useInvitationPreview = (token: string) =>
  useQuery({
    queryKey: ["invitation-preview", token],
    queryFn: () => apiFetch<InvitationPreview>("/invitations/preview", json("POST", { token })),
    retry: false,
  });

export function useAcceptInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AcceptInvitationInput) => apiFetch<AuthTokens>("/invitations/accept", json("POST", body)),
    onSuccess: ({ accessToken }) => {
      setAccessToken(accessToken);
      queryClient.clear();
    },
  });
}
