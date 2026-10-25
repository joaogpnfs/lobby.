"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { errorMessage } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { meKey, useMe } from "@/features/auth/api";
import { apiFetch } from "@/lib/api-client";

const RESULT: Record<string, { text: string; error?: boolean }> = {
  linked: { text: "LinkedIn conectado. Agora você também pode entrar com ele." },
  taken: { text: "Este LinkedIn já está conectado a outra conta do Lobby. Desconecte por lá primeiro.", error: true },
  error: { text: "Não foi possível conectar o LinkedIn. Tente de novo.", error: true },
};

export function LinkedinSection({ result }: { result?: string }) {
  const me = useMe();
  const queryClient = useQueryClient();
  const connect = useMutation({
    mutationFn: () => apiFetch<{ url: string }>("/auth/linkedin/link", { method: "POST" }),
    onSuccess: ({ url }) => window.location.assign(url),
  });
  const disconnect = useMutation({
    mutationFn: () => apiFetch<null>("/auth/linkedin", { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: meKey }),
  });
  const connected = me.data?.user.linkedinConnected;
  const notice = result ? RESULT[result] : undefined;
  const failure = connect.error ?? disconnect.error;

  return (
    <section className="grid gap-4">
      <div className="grid gap-1">
        <h2 className="text-lg font-medium">LinkedIn</h2>
        <p className="text-sm text-muted-foreground">
          {connected
            ? "Sua conta está conectada ao LinkedIn. Você pode entrar no Lobby com ele."
            : "Conecte para usar a foto do LinkedIn e entrar no Lobby sem digitar a senha."}
        </p>
      </div>
      {notice && (
        <p role={notice.error ? "alert" : "status"} className={notice.error ? "text-sm text-destructive" : "text-sm"}>
          {notice.text}
        </p>
      )}
      <div>
        {connected ? (
          <Button variant="outline" disabled={disconnect.isPending} onClick={() => disconnect.mutate()}>
            Desconectar LinkedIn
          </Button>
        ) : (
          <Button variant="outline" disabled={connect.isPending} onClick={() => connect.mutate()}>
            {connect.isPending ? "Abrindo o LinkedIn…" : "Conectar LinkedIn"}
          </Button>
        )}
      </div>
      {failure && (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage(failure)}
        </p>
      )}
    </section>
  );
}
