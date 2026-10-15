import type { PageMeta } from "@lobby/types";
import { Button } from "@/components/ui/button";

export function Pagination({ meta, onPage }: { meta: PageMeta; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(meta.total / meta.pageSize));
  if (meta.total <= meta.pageSize) return null;
  const from = (meta.page - 1) * meta.pageSize + 1;
  const to = Math.min(meta.page * meta.pageSize, meta.total);
  return (
    <nav aria-label="Paginação" className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
      <span>
        {from}–{to} de {meta.total}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>
          Anterior
        </Button>
        <Button variant="outline" size="sm" disabled={meta.page >= pages} onClick={() => onPage(meta.page + 1)}>
          Próxima
        </Button>
      </div>
    </nav>
  );
}
