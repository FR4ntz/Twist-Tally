"use client";

import Link from "next/link";
import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { Icon, Kancing } from "./icons";

export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

type Variant = "primary" | "thread" | "ghost" | "danger";
type Size = "md" | "sm";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:brightness-125",
  thread: "bg-thread text-thread-ink hover:brightness-105",
  ghost: "border-2 border-edge bg-transparent text-ink hover:bg-paper-deep",
  danger: "bg-danger text-paper hover:brightness-110",
};

const sizes: Record<Size, string> = {
  md: "min-h-12 px-5 text-base",
  sm: "min-h-11 px-4 text-sm",
};

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-[12px] font-bold leading-tight transition duration-150 " +
  "active:translate-y-px active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 select-none";

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonBase, variants[variant], sizes[size], className)}
      {...props}
    >
      {loading && <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={cn(buttonBase, variants[variant], sizes[size], className)}>
      {children}
    </Link>
  );
}

const fieldBase =
  "w-full min-h-12 rounded-[10px] border-2 border-edge bg-card px-3.5 text-base text-ink " +
  "placeholder:text-ink-soft/80 disabled:opacity-60 aria-[invalid=true]:border-danger";

type FieldProps = { label: string; hint?: string; error?: string | null };

export function Field({
  label,
  hint,
  error,
  className,
  ...props
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-bold">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${id}-note` : undefined}
        className={cn(fieldBase, className)}
        {...props}
      />
      {(error || hint) && (
        <p id={`${id}-note`} className={cn("text-sm", error ? "font-bold text-danger" : "text-ink-soft")}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

export function TextArea({ label, hint, error, className, ...props }: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-bold">
        {label}
      </label>
      <textarea
        id={id}
        rows={3}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${id}-note` : undefined}
        className={cn(fieldBase, "py-2.5", className)}
        {...props}
      />
      {(error || hint) && (
        <p id={`${id}-note`} className={cn("text-sm", error ? "font-bold text-danger" : "text-ink-soft")}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

export function SelectField({
  label,
  children,
  className,
  ...props
}: { label: string } & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-bold">
        {label}
      </label>
      <select id={id} className={cn(fieldBase, className)} {...props}>
        {children}
      </select>
    </div>
  );
}

export function Chip({ children, tone = "plain" }: { children: ReactNode; tone?: "plain" | "thread" | "denim" | "danger" }) {
  const tones = {
    plain: "border border-edge/60 bg-card text-ink",
    thread: "bg-thread text-thread-ink",
    denim: "bg-fill text-on-fill",
    danger: "bg-danger-soft text-danger",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-chip px-2 py-0.5 text-xs font-bold", tones[tone])}>
      {children}
    </span>
  );
}

export function Points({ value, className, size = 18 }: { value: number; className?: string; size?: number }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-bold", className)}>
      <Kancing size={size} className="text-thread [--kancing-hole:#2a1b00]" />
      {value}
      <span className="sr-only"> poin</span>
    </span>
  );
}

export function LoadingBlock({ label }: { label: string }) {
  return (
    <div role="status" className="grid gap-3 py-8 text-center">
      <div className="loading-thread mx-auto w-40 text-stitch" aria-hidden="true" />
      <p className="text-sm font-bold text-ink-soft">{label}</p>
    </div>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="patch patch-linen px-6 py-7 text-center">
      <p className="font-display text-2xl font-black">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-ink-soft">{children}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorState({ title, children, onRetry }: { title: string; children: ReactNode; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-patch border-2 border-danger bg-danger-soft px-5 py-5 text-ink">
      <p className="flex items-center gap-2 font-bold text-danger">
        <Icon name="warning" size={20} />
        {title}
      </p>
      <p className="mt-1.5 text-sm">{children}</p>
      {onRetry && (
        <Button variant="ghost" size="sm" className="mt-3" onClick={onRetry}>
          Coba lagi
        </Button>
      )}
    </div>
  );
}

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      {open && (
        <div className="p-5 sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <h2 id={titleId} className="text-3xl">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="-mr-2 -mt-1 grid size-11 shrink-0 place-items-center rounded-full text-ink hover:bg-paper-deep"
            >
              <Icon name="close" size={22} />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

export function ConfirmSheet({
  open,
  title,
  body,
  confirmLabel,
  danger,
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="grid gap-5">
        <div className="text-ink-soft">{body}</div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button variant={danger ? "danger" : "primary"} loading={busy} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-12 w-full items-center justify-between gap-4 text-left"
    >
      <span className="font-bold">{label}</span>
      <span
        aria-hidden="true"
        className={cn(
          "relative h-8 w-14 shrink-0 rounded-[10px] border-2 transition-colors",
          checked ? "border-ink bg-ink" : "border-edge bg-card",
        )}
      >
        <span
          className={cn(
            "absolute top-1/2 size-5 -translate-y-1/2 rounded-full transition-all",
            checked ? "left-[calc(100%-1.55rem)] bg-thread" : "left-1 bg-edge",
          )}
        />
      </span>
    </button>
  );
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const move = (index: number) => {
    const next = tabs[(index + tabs.length) % tabs.length];
    onChange(next.id);
    refs.current[next.id]?.focus();
  };
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("gap-1 rounded-[12px] bg-paper-deep p-1", tabs.length >= 4 ? "grid grid-cols-2 sm:flex" : "flex")}
    >
      {tabs.map((tab, i) => (
        <button
          key={tab.id}
          ref={(node) => {
            refs.current[tab.id] = node;
          }}
          type="button"
          role="tab"
          id={`tab-${tab.id}`}
          aria-selected={value === tab.id}
          aria-controls={`panel-${tab.id}`}
          tabIndex={value === tab.id ? 0 : -1}
          onClick={() => onChange(tab.id)}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") move(i + 1);
            if (event.key === "ArrowLeft") move(i - 1);
          }}
          className={cn(
            "min-h-11 min-w-0 flex-1 rounded-[9px] px-3 py-1.5 text-sm font-bold leading-tight transition-colors",
            value === tab.id ? "bg-card text-ink shadow-[0_1px_0_var(--edge)]" : "text-ink-soft hover:text-ink",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

/** Pengukur isi tempat sampah: sepuluh jahitan yang terisi berurutan. Persen selalu ditulis juga. */
export function FillGauge({ percent, label }: { percent: number; label?: string }) {
  const filled = Math.ceil(percent / 10);
  const warn = percent >= 80;
  return (
    <div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-label={label ?? "Isi tempat sampah"}
      className="flex items-center gap-3"
    >
      <div className="flex flex-1 gap-1" aria-hidden="true">
        {Array.from({ length: 10 }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-4 flex-1 rounded-[3px]",
              i < filled ? (warn ? "bg-thread" : "bg-fill") : "border-2 border-dashed border-stitch",
            )}
          />
        ))}
      </div>
      <span className="w-12 text-right text-sm font-bold tabular-nums">{percent}%</span>
    </div>
  );
}

export function PageTitle({ title, children, className = "mb-5" }: { title: string; children?: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <h1 className="text-4xl sm:text-5xl">{title}</h1>
      {children && <p className="mt-2 max-w-prose text-ink-soft">{children}</p>}
    </div>
  );
}
