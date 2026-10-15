import type { ComponentProps, ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Common = { id: string; label: string; error?: string; hint?: string };

// Label, control and message wired for screen readers (aria-invalid + aria-describedby).
function Shell({ id, label, error, hint, children }: Common & { children: (a11y: object) => ReactNode }) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children({ id, "aria-invalid": !!error, "aria-describedby": describedBy })}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function FormField({ id, label, error, hint, className, ...input }: Common & ComponentProps<"input">) {
  return (
    <Shell id={id} label={label} error={error} hint={hint}>
      {(a11y) => <Input className={cn("h-10", className)} {...a11y} {...input} />}
    </Shell>
  );
}

export function TextareaField({ id, label, error, hint, ...input }: Common & ComponentProps<"textarea">) {
  return (
    <Shell id={id} label={label} error={error} hint={hint}>
      {(a11y) => <Textarea {...a11y} {...input} />}
    </Shell>
  );
}

// Native select: keyboard, mobile pickers and screen readers work out of the box.
export function SelectField({
  id,
  label,
  error,
  hint,
  options,
  placeholder,
  className,
  ...select
}: Common & ComponentProps<"select"> & { options: { value: string; label: string }[]; placeholder?: string }) {
  return (
    <Shell id={id} label={label} error={error} hint={hint}>
      {(a11y) => (
        <select
          className={cn(
            "h-10 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive",
            className,
          )}
          {...a11y}
          {...select}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Shell>
  );
}
