import { type ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  return (
    <div
      style={{
        animation: "pageIn 0.35s cubic-bezier(.2,.8,.2,1)",
        willChange: "opacity, transform",
      }}
    >
      {children}
      <style>{`
        @keyframes pageIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
