"use client";
import { CheckCircle2, X } from "lucide-react";
export function Toast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <div className="toast" role="status">
      <CheckCircle2 size={20} />
      <span>{message}</span>
      <button className="secondary" aria-label="ปิดข้อความ" onClick={onClose}>
        <X size={15} />
      </button>
    </div>
  );
}
