// Small styled wrappers around Base UI primitives (behaviour and accessibility come from Base UI).
import { Menu } from "@base-ui/react/menu";
import { Select } from "@base-ui/react/select";
import { Switch } from "@base-ui/react/switch";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Tooltip } from "@base-ui/react/tooltip";
import { Check, ChevronDown } from "lucide-react";
import {
  createContext,
  use,
  useId,
  useMemo,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";

import { cn } from "../lib/cn.ts";

const focus = "outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-0";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
};

export function Button({ variant = "secondary", size = "md", className, type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors select-none disabled:cursor-not-allowed disabled:opacity-45",
        size === "sm" ? "h-7 px-2 text-xs" : "h-8 px-3 text-sm",
        variant === "primary" && "bg-accent text-accent-ink hover:bg-accent/90",
        variant === "secondary" && "border border-line bg-raised text-ink hover:border-line-strong hover:bg-raised/70",
        variant === "ghost" && "text-muted hover:bg-raised hover:text-ink",
        focus,
        className,
      )}
      {...props}
    />
  );
}

export function IconButton({
  label,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <Tip content={label}>
      <button
        type="button"
        aria-label={label}
        className={cn(
          "inline-flex size-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-raised hover:text-ink disabled:opacity-40",
          focus,
          className,
        )}
        {...props}
      />
    </Tip>
  );
}

export function Tip({ content, children }: { content: ReactNode; children: ReactElement }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger render={children} />
      <Tooltip.Portal>
        <Tooltip.Positioner sideOffset={6}>
          <Tooltip.Popup className="max-w-64 rounded-md border border-line bg-field px-2 py-1 text-xs text-ink shadow-lg">
            {content}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

/** Ids that tie a field's label and hint to its control (a native `<label for>` can't name every control). */
interface FieldIds {
  readonly control: string;
  readonly label: string;
  readonly hint: string | undefined;
}

const FieldContext = createContext<FieldIds | null>(null);

export function Field({ label, hint, children }: { label: ReactNode; hint?: ReactNode; children: ReactNode }) {
  const id = useId();
  const hasHint = !!hint;
  const ids = useMemo<FieldIds>(
    () => ({ control: `${id}c`, label: `${id}l`, hint: hasHint ? `${id}h` : undefined }),
    [id, hasHint],
  );
  return (
    <FieldContext value={ids}>
      <div className="flex flex-col gap-1">
        <label id={ids.label} htmlFor={ids.control} className="text-xs font-medium text-muted">
          {label}
        </label>
        {children}
        {hint ? (
          <span id={ids.hint} className="text-[11px] leading-snug text-muted">
            {hint}
          </span>
        ) : null}
      </div>
    </FieldContext>
  );
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const field = use(FieldContext);
  return (
    <input
      id={field?.control}
      aria-describedby={field?.hint}
      className={cn(
        "h-8 w-full rounded-md border border-line bg-field px-2 text-sm text-ink placeholder:text-muted hover:border-line-strong",
        focus,
        className,
      )}
      {...props}
    />
  );
}

export interface Option<T extends string> {
  value: T;
  label: string;
  hint?: string;
  disabled?: boolean;
}

export function SelectInput<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: ReadonlyArray<Option<T>>;
  onChange: (v: T) => void;
  label: string;
}) {
  const field = use(FieldContext);
  return (
    <Select.Root
      items={options.map((o) => ({ value: o.value, label: o.label }))}
      value={value}
      onValueChange={(v) => {
        const hit = options.find((o) => o.value === v);
        if (hit) onChange(hit.value);
      }}
    >
      <Select.Trigger
        id={field?.control}
        aria-label={field ? undefined : label}
        aria-labelledby={field?.label}
        aria-describedby={field?.hint}
        className={cn(
          "flex h-8 w-full items-center justify-between gap-2 rounded-md border border-line bg-field pr-1.5 pl-2 text-left text-sm text-ink hover:border-line-strong",
          focus,
        )}
      >
        <Select.Value className="truncate" />
        <Select.Icon className="text-muted">
          <ChevronDown className="size-4" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner sideOffset={4} className="z-50 outline-none" alignItemWithTrigger={false}>
          <Select.Popup className="min-w-(--anchor-width) rounded-md border border-line bg-field p-1 shadow-xl outline-none">
            <Select.List>
              {options.map((o) => (
                <Select.Item
                  key={o.value}
                  value={o.value}
                  disabled={o.disabled}
                  className="grid cursor-default grid-cols-[1rem_1fr] items-start gap-2 rounded px-2 py-1.5 text-sm text-ink outline-none select-none data-disabled:opacity-40 data-highlighted:bg-accent data-highlighted:text-accent-ink"
                >
                  <Select.ItemIndicator className="pt-0.5">
                    <Check className="size-3.5" />
                  </Select.ItemIndicator>
                  <span className="col-start-2 flex flex-col">
                    <Select.ItemText>{o.label}</Select.ItemText>
                    {o.hint ? <span className="text-[11px] opacity-70">{o.hint}</span> : null}
                  </span>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: ReadonlyArray<Option<T>>;
  onChange: (v: T) => void;
  label: string;
}) {
  const field = use(FieldContext);
  return (
    <ToggleGroup
      aria-label={field ? undefined : label}
      aria-labelledby={field?.label}
      aria-describedby={field?.hint}
      value={[value]}
      onValueChange={(v) => {
        const hit = options.find((o) => o.value === v[0]);
        if (hit) onChange(hit.value);
      }}
      className="grid auto-cols-fr grid-flow-col gap-0.5 rounded-md border border-line bg-field p-0.5"
    >
      {options.map((o) => (
        <Toggle
          key={o.value}
          value={o.value}
          disabled={o.disabled}
          aria-label={o.label}
          className={cn(
            "h-7 rounded px-2 text-xs font-medium text-muted transition-colors hover:text-ink data-disabled:opacity-35 data-pressed:bg-raised data-pressed:text-ink data-pressed:shadow",
            focus,
          )}
        >
          {o.label}
        </Toggle>
      ))}
    </ToggleGroup>
  );
}

export function SwitchInput({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  hint?: ReactNode;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <label className={cn("flex items-start justify-between gap-3", disabled && "opacity-45")}>
      <span className="flex flex-col">
        <span id={`${id}l`} className="text-sm text-ink">
          {label}
        </span>
        {hint ? (
          <span id={`${id}h`} className="text-[11px] leading-snug text-muted">
            {hint}
          </span>
        ) : null}
      </span>
      {/* Base UI renders a <span role="switch">, which a wrapping <label> doesn't name */}
      <Switch.Root
        aria-labelledby={`${id}l`}
        aria-describedby={hint ? `${id}h` : undefined}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        className={cn(
          "relative mt-0.5 flex h-5 w-9 shrink-0 rounded-full border border-line bg-field p-0.5 transition-colors data-checked:border-accent data-checked:bg-accent",
          focus,
        )}
      >
        <Switch.Thumb className="size-3.5 rounded-full bg-ink transition-transform data-checked:translate-x-4 data-checked:bg-accent-ink" />
      </Switch.Root>
    </label>
  );
}

export type MenuEntry =
  | {
      readonly kind: "item";
      readonly key: string;
      readonly label: ReactNode;
      readonly hint?: ReactNode;
      readonly onSelect: () => void;
    }
  | { readonly kind: "separator"; readonly key: string }
  | { readonly kind: "heading"; readonly key: string; readonly text: string };

export function DropdownMenu({
  trigger,
  items,
  label,
}: {
  trigger: ReactElement;
  label: string;
  items: readonly MenuEntry[];
}) {
  return (
    <Menu.Root>
      <Menu.Trigger render={trigger} aria-label={label} />
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="start" className="z-50 outline-none">
          <Menu.Popup className="min-w-56 rounded-md border border-line bg-field p-1 shadow-xl outline-none">
            {items.map((item) =>
              item.kind === "separator" ? (
                <Menu.Separator key={item.key} className="my-1 h-px bg-line" />
              ) : item.kind === "heading" ? (
                <div
                  key={item.key}
                  className="px-2 pt-1.5 pb-1 text-[11px] font-semibold tracking-wide text-muted uppercase"
                >
                  {item.text}
                </div>
              ) : (
                <Menu.Item
                  key={item.key}
                  onClick={item.onSelect}
                  className="flex cursor-default flex-col rounded px-2 py-1.5 text-sm text-ink outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-ink"
                >
                  <span>{item.label}</span>
                  {item.hint ? <span className="text-[11px] opacity-70">{item.hint}</span> : null}
                </Menu.Item>
              ),
            )}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-line bg-field px-1 font-mono text-[10px] text-muted">{children}</kbd>;
}
