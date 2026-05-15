type ConfirmModalProps = {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  isLight: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  open,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  danger = false,
  isLight,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar modal"
        onClick={onCancel}
        className="absolute inset-0 bg-black/60 backdrop-blur-[1px]"
      />
      <div
        className={[
          "relative z-10 w-full max-w-md rounded-2xl border p-5 shadow-2xl",
          isLight ? "border-[#E5E7EB] bg-white" : "border-white/[0.1] bg-[#121212]",
        ].join(" ")}
      >
        <h3 className={["text-lg font-semibold", isLight ? "text-[#111827]" : "text-zinc-100"].join(" ")}>{title}</h3>
        <p className={["mt-2 text-sm", isLight ? "text-[#6B7280]" : "text-zinc-400"].join(" ")}>{message}</p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className={[
              "rounded-lg px-4 py-2 text-sm font-medium",
              isLight
                ? "border border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F9FAFB]"
                : "border border-white/[0.1] bg-[#1a1a1a] text-zinc-200 hover:bg-white/[0.06]",
            ].join(" ")}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={[
              "rounded-lg px-4 py-2 text-sm font-semibold text-white",
              danger ? "bg-red-600 hover:bg-red-700" : "bg-[#007BFF] hover:bg-[#0063D5]",
            ].join(" ")}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

