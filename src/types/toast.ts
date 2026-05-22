import { createContext } from "react";

export interface ToastMessage {
  id: string;
  title: string;
  message?: string;
  type: "success" | "error" | "warning" | "info" | "match" | "transfer" | "offer";
  duration?: number;
}

export interface ToastContextType {
  queue: ToastMessage[];
  push: (toast: Omit<ToastMessage, "id">) => void;
  dismiss: (id: string) => void;
}

export const ToastContext = createContext<ToastContextType | null>(null);
