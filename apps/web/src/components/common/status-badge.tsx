import type { EmployeeStatus } from "@lobby/types";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL } from "@/lib/labels";

const variant = { ACTIVE: "secondary", PENDING: "outline", ON_LEAVE: "outline", TERMINATED: "destructive" } as const;

export function StatusBadge({ status }: { status: EmployeeStatus }) {
  return <Badge variant={variant[status]}>{STATUS_LABEL[status]}</Badge>;
}
