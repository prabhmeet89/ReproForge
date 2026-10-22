import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { cn } from "../../lib/utils";

export interface ToastProps {
  type?: "success" | "error" | "info";
  message: string;
  onClose: () => void;
}

export function Toast({ type = "success", message, onClose }: ToastProps) {
  const styles = {
    success: "bg-emerald-950/90 border-emerald-500/40 text-emerald-200",
    error: "bg-rose-950/90 border-rose-500/40 text-rose-200",
    info: "bg-gray-900/90 border-gray-700 text-gray-200",
  };

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />,
    info: <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />,
  };

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur-xl shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-4",
        styles[type]
      )}
    >
      {icons[type]}
      <p className="text-sm font-medium">{message}</p>
      <button
        onClick={onClose}
        className="ml-2 text-gray-400 hover:text-white p-1 transition-colors cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
