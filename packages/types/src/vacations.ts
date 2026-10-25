import { z } from "zod";
import { listQuerySchema, type Ref } from "./people.js";

export const VACATION_STATUSES = ["PENDING", "APPROVED", "REJECTED", "CANCELLED", "COMPLETED"] as const;
export type VacationStatus = (typeof VACATION_STATUSES)[number];

export const MIN_VACATION_DAYS = 5;
export const MAX_VACATION_DAYS = 30;

export const vacationDays = (startDate: string, endDate: string) =>
  Math.round((Date.parse(endDate) - Date.parse(startDate)) / 86_400_000) + 1;

export const createVacationSchema = z
  .object({
    startDate: z.iso.date(),
    endDate: z.iso.date(),
    reason: z.string().trim().max(500).nullish(),
  })
  .strict()
  .refine((v) => v.endDate >= v.startDate, { path: ["endDate"], message: "A volta precisa ser depois da ida" })
  .refine(
    (v) => {
      const days = vacationDays(v.startDate, v.endDate);
      return days >= MIN_VACATION_DAYS && days <= MAX_VACATION_DAYS;
    },
    { path: ["endDate"], message: `Escolha um período de ${MIN_VACATION_DAYS} a ${MAX_VACATION_DAYS} dias` },
  );
export type CreateVacationInput = z.infer<typeof createVacationSchema>;

export const rejectVacationSchema = z
  .object({ note: z.string().trim().min(2, "Diga o motivo para a pessoa").max(500) })
  .strict();
export type RejectVacationInput = z.infer<typeof rejectVacationSchema>;

export const vacationListQuerySchema = listQuerySchema.extend({
  status: z.enum(VACATION_STATUSES).optional(),
  employeeId: z.uuid().optional(),
  awaitingMe: z.stringbool().optional(),
});
export type VacationListQuery = z.infer<typeof vacationListQuerySchema>;

export type VacationDto = {
  id: string;
  employee: Ref;
  startDate: string;
  endDate: string;
  days: number;
  status: VacationStatus;
  reason: string | null;
  decisionNote: string | null;
  decidedBy: Ref | null;
  decidedAt: string | null;
  createdAt: string;
  canDecide: boolean;
  canCancel: boolean;
};

export type VacationSummary = {
  onVacationToday: Ref[];
  awaitingMe: number;
  mine: VacationDto[];
};

export type NotificationType = "VACATION_REQUESTED" | "VACATION_APPROVED" | "VACATION_REJECTED";

export type NotificationDto = {
  id: string;
  type: NotificationType;
  data: { vacationId: string; employeeName: string; startDate: string; endDate: string };
  readAt: string | null;
  createdAt: string;
};

export type NotificationList = { items: NotificationDto[]; unread: number };
