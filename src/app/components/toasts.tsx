import { Toast } from "@base-ui/react/toast";
import { X } from "lucide-react";

export const toastManager = Toast.createToastManager();

export function notify(
  title: string,
  description?: string,
  options: { type?: "success" | "error" | "info"; action?: { label: string; onClick: () => void } } = {},
): void {
  const type = options.type ?? "info";
  toastManager.add({
    title,
    description,
    type,
    timeout: type === "error" ? 9000 : 4500,
    actionProps: options.action ? { children: options.action.label, onClick: options.action.onClick } : undefined,
  });
}

function ToastList() {
  const { toasts } = Toast.useToastManager();
  return toasts.map((toast) => (
    <Toast.Root
      key={toast.id}
      toast={toast}
      className="rounded-lg border border-line bg-field shadow-xl transition-all data-ending-style:translate-y-2 data-ending-style:opacity-0 data-starting-style:translate-y-2 data-starting-style:opacity-0 data-[type=error]:border-danger/70 data-[type=success]:border-ok/60"
    >
      <Toast.Content className="flex items-start gap-3 p-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Toast.Title className="text-sm font-semibold text-ink" />
          <Toast.Description className="text-xs break-words text-muted" />
          <Toast.Action className="mt-1.5 self-start rounded border border-line px-2 py-0.5 text-xs text-ink hover:bg-raised" />
        </div>
        <Toast.Close aria-label="Dismiss" className="rounded p-0.5 text-muted hover:bg-raised hover:text-ink">
          <X className="size-3.5" />
        </Toast.Close>
      </Toast.Content>
    </Toast.Root>
  ));
}

export function Toaster() {
  return (
    <Toast.Portal>
      <Toast.Viewport className="fixed right-4 bottom-4 z-50 flex w-80 flex-col gap-2 outline-none">
        <ToastList />
      </Toast.Viewport>
    </Toast.Portal>
  );
}
