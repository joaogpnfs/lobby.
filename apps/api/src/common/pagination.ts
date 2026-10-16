import type { ListQuery, PageMeta } from "@lobby/types";

export class Page<T> {
  constructor(
    readonly items: T[],
    readonly meta: PageMeta,
  ) {}
}

export const paging = ({ page, pageSize }: ListQuery) => ({ skip: (page - 1) * pageSize, take: pageSize });
