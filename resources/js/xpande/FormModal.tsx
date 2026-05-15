import type { ReactNode } from "react";

type FormModalProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  isLight: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
};

export function FormModal({ open, title, subtitle, isLight, onClose, children, footer, wide }: FormModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
      <button type="button" aria-label="Cerrar modal" className="absolute inset-0 bg-black/65 backdrop-blur-[1px]" onClick={onClose} />
      <div
        className={[
          "relative z-10 flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl border shadow-2xl",
          wide ? "max-w-3xl" : "max-w-xl",
          isLight ? "border-[#E5E7EB] bg-white" : "border-white/[0.08] bg-[#121212]",
        ].join(" ")}
      >
        <header className={["flex shrink-0 items-start justify-between gap-4 border-b px-5 py-4", isLight ? "border-[#F3F4F6]" : "border-white/[0.06]"].join(" ")}>
          <div>
            <h2 className={["text-lg font-semibold", isLight ? "text-[#111827]" : "text-zinc-100"].join(" ")}>{title}</h2>
            {subtitle ? <p className={["mt-1 text-xs", isLight ? "text-[#6B7280]" : "text-zinc-500"].join(" ")}>{subtitle}</p> : null}
          </div>
          <button
            type="button"
            className={[isLight ? "text-[#6B7280] hover:bg-[#F3F4F6]" : "text-zinc-400 hover:bg-white/[0.05]", "rounded-lg px-2 py-1 text-sm"].join(
              " ",
            )}
            onClick={onClose}
          >
            ✕
          </button>
        </header>
        <div className={["min-h-0 flex-1 overflow-y-auto px-5 py-4", isLight ? "apex-main-scroll--light" : "apex-main-scroll--dark"].join(" ")}>
          {children}
        </div>
        {footer ? <footer className={["shrink-0 border-t px-5 py-4", isLight ? "border-[#F3F4F6] bg-[#FAFAFA]" : "border-white/[0.06] bg-[#0d0d0d]"].join(" ")}>{footer}</footer> : null}
      </div>
    </div>
  );
}
