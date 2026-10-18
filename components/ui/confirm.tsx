"use client";
import { useEffect, useRef } from "react";
export function Confirm({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog ref={ref} onCancel={onCancel}>
      <h2>ยืนยันการดำเนินการ</h2>
      <p>{message}</p>
      <div className="form-footer">
        <button className="secondary" onClick={onCancel}>
          ยกเลิก
        </button>
        <button className="danger" onClick={onConfirm}>
          ยืนยัน
        </button>
      </div>
    </dialog>
  );
}
