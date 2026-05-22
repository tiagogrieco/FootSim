import { useRef, useEffect } from "react";
import { useLocation, Outlet } from "react-router-dom";

export default function AnimatedOutlet() {
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    prevPathRef.current = location.pathname;
  });

  return (
    <div
      key={location.pathname}
      style={{
        animation: "pageIn 0.3s cubic-bezier(.2,.8,.2,1)",
        willChange: "opacity, transform",
      }}
    >
      <Outlet />
      <style>{`
        @keyframes pageIn {
          from { opacity: 0; transform: translateY(12px) scale(0.995); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
