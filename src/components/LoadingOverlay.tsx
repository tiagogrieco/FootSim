interface LoadingOverlayProps {
  show: boolean;
  message?: string;
}

export default function LoadingOverlay({ show, message = "Carregando..." }: LoadingOverlayProps) {
  if (!show) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9997,
        background: "rgba(2, 6, 23, 0.85)",
        backdropFilter: "blur(4px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          border: "4px solid rgba(59, 130, 246, 0.2)",
          borderTopColor: "#3b82f6",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <p style={{ color: "#94a3b8", fontSize: 14, fontWeight: 600, letterSpacing: 1 }}>{message}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
