import { useState, useCallback, useRef, type ReactNode } from "react";
import { ToastContext, type ToastMessage } from "../types/toast";

export function ToastProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<ToastMessage[]>([]);
  const idRef = useRef(0);

  const push = useCallback((toast: Omit<ToastMessage, "id">) => {
    const id = `toast-${++idRef.current}-${Date.now()}`;
    const item: ToastMessage = { ...toast, id, duration: toast.duration ?? 4000 };
    setQueue(prev => [...prev, item]);
    setTimeout(() => {
      setQueue(prev => prev.filter(t => t.id !== id));
    }, item.duration);
  }, []);

  const dismiss = useCallback((id: string) => {
    setQueue(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ queue, push, dismiss }}>
      {children}
    </ToastContext.Provider>
  );
}
