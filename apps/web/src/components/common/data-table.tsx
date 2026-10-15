import Link from "next/link";
import type { ReactNode } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type Column<T> = { header: string; cell: (row: T) => ReactNode; className?: string };

// Plain table; when `href` is given the first cell links to the row's page (keyboard and middle-click work).
export function DataTable<T extends { id: string }>({
  columns,
  rows,
  href,
  actions,
}: {
  columns: Column<T>[];
  rows: T[];
  href?: (row: T) => string;
  actions?: (row: T) => ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead key={c.header} className={c.className}>
                {c.header}
              </TableHead>
            ))}
            {actions && (
              <TableHead className="w-0">
                <span className="sr-only">Ações</span>
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              {columns.map((c, i) => (
                <TableCell key={c.header} className={cn("py-3", c.className)}>
                  {i === 0 && href ? (
                    <Link href={href(row)} className="font-medium hover:underline">
                      {c.cell(row)}
                    </Link>
                  ) : (
                    c.cell(row)
                  )}
                </TableCell>
              ))}
              {actions && <TableCell className="py-2 text-right whitespace-nowrap">{actions(row)}</TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
