import { X } from "lucide-react";
import { useEffect } from "react";

export default function Modal({ title, children, onClose, size = "md" }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-0 sm:px-4"
      onClick={onClose}>
      <div
        className={`bg-[#f3f6f1] border border-[#bcc8b7] rounded-t-2xl sm:rounded-2xl w-full ${widths[size]} shadow-2xl max-h-[90vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#c9d4c5] shrink-0 bg-[#e8eee5]">
          <h2 className="text-base font-semibold text-black">{title}</h2>
          <button onClick={onClose} className="text-black/60 hover:text-black transition">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
