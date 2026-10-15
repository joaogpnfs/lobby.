import { zodResolver } from "@hookform/resolvers/zod";
import type { FieldValues, Resolver } from "react-hook-form";
import type { z } from "zod";

// Empty inputs mean "no value": validated and sent as null, so the API clears the field.
export function emptyAsNull<T extends FieldValues = Record<string, string>>(schema: z.ZodType): Resolver<T> {
  const resolve = zodResolver(schema as z.ZodType<object, Record<string, unknown>>);
  return (values, ctx, options) =>
    resolve(
      Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v === "" ? null : v])),
      ctx,
      options as never,
    ) as ReturnType<Resolver<T>>;
}
