import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";
import type { InboxMessage } from "../types/game";

export default function InboxView() {
  const { inbox = [], markMessageRead, replyToMessage } = useGame();
  const navigate = useNavigate();

  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    inbox.length > 0 ? inbox[0].id : null
  );
  const [filter, setFilter] = useState<"all" | "board" | "player" | "system">("all");

  const selectedMessage = inbox.find(m => m.id === selectedMessageId) || null;

  const filteredMessages = inbox.filter(msg => {
    if (filter === "all") return true;
    return msg.type === filter;
  });

  const handleSelectMessage = (msg: InboxMessage) => {
    setSelectedMessageId(msg.id);
    markMessageRead(msg.id);
  };

  const handleChooseOption = (msgId: string, optionId: string) => {
    replyToMessage(msgId, optionId);
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <button style={styles.backBtn} onClick={() => navigate("/game")}>
            ← Voltar ao Painel
          </button>
          <h1 style={styles.title}>📧 Caixa de Entrada</h1>
          <p style={styles.sub}>Gerencie e-mails da diretoria, relatórios de observação e dramas do vestiário</p>
        </div>
      </div>

      <div style={styles.container}>
        {/* Sidebar List */}
        <div style={styles.sidebar}>
          {/* Filters */}
          <div style={styles.filters}>
            <button
              style={{ ...styles.filterTab, ...(filter === "all" ? styles.activeFilterTab : {}) }}
              onClick={() => setFilter("all")}
            >
              Todos
            </button>
            <button
              style={{ ...styles.filterTab, ...(filter === "board" ? styles.activeFilterTab : {}) }}
              onClick={() => setFilter("board")}
            >
              Diretoria
            </button>
            <button
              style={{ ...styles.filterTab, ...(filter === "player" ? styles.activeFilterTab : {}) }}
              onClick={() => setFilter("player")}
            >
              Jogadores
            </button>
          </div>

          <div style={styles.listContainer}>
            {filteredMessages.length === 0 ? (
              <div style={styles.emptyList}>
                <span>📭</span>
                <p>Nenhuma mensagem</p>
              </div>
            ) : (
              filteredMessages.map(msg => {
                const isSelected = selectedMessage?.id === msg.id;
                return (
                  <div
                    key={msg.id}
                    onClick={() => handleSelectMessage(msg)}
                    style={{
                      ...styles.msgItem,
                      ...(isSelected ? styles.msgItemSelected : {}),
                      ...(msg.read ? {} : styles.msgItemUnread)
                    }}
                  >
                    <div style={styles.msgMeta}>
                      <span style={{
                        ...styles.senderTag,
                        color: msg.type === "board" ? "var(--color-accent-secondary)" : msg.type === "player" ? "var(--color-accent-primary)" : "var(--color-text)"
                      }}>
                        {msg.sender}
                      </span>
                      <span style={styles.msgDate}>
                        {msg.date.split("-")[2]}/{msg.date.split("-")[1]}
                      </span>
                    </div>
                    <div style={styles.msgSubject}>
                      {!msg.read && <span style={styles.unreadDot} />}
                      {msg.subject}
                    </div>
                    <div style={styles.msgSnippet}>
                      {msg.body.substring(0, 60)}...
                    </div>
                    {msg.actionRequired && !msg.actionCompleted && (
                      <span style={styles.actionBadge}>Requer Resposta</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Message Content Pane */}
        <div style={styles.contentPane}>
          {selectedMessage ? (
            <div style={styles.emailCard}>
              <div style={styles.emailHeader}>
                <div style={styles.emailSenderBlock}>
                  <div style={styles.avatar}>
                    {selectedMessage.sender.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={styles.emailSenderName}>{selectedMessage.sender}</h3>
                    <p style={styles.emailRecipient}>Para: Você (Treinador)</p>
                  </div>
                </div>
                <div style={styles.emailDate}>
                  Enviado em: {selectedMessage.date.split("-")[2]}/{selectedMessage.date.split("-")[1]}/{selectedMessage.date.split("-")[0]}
                </div>
              </div>

              <h2 style={styles.emailSubjectTitle}>{selectedMessage.subject}</h2>

              <div style={styles.emailBody}>
                {selectedMessage.body.split("\n").map((para, i) => (
                  <p key={i} style={{ marginBottom: "12px", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
                    {para}
                  </p>
                ))}
              </div>

              {/* Action options selection */}
              {selectedMessage.actionRequired && !selectedMessage.actionCompleted && selectedMessage.actionOptions && (
                <div style={styles.actionBox}>
                  <h4 style={styles.actionTitle}>⚡ Decisão Importante Requerida</h4>
                  <div style={styles.actionOptionsList}>
                    {selectedMessage.actionOptions.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => handleChooseOption(selectedMessage.id, opt.id)}
                        style={styles.actionBtn}
                      >
                        {opt.text}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={styles.noSelection}>
              <span>📬</span>
              <p>Selecione um e-mail para ler</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: "24px",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    overflow: "hidden"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  backBtn: {
    background: "none",
    border: "none",
    color: "var(--color-accent-primary)",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600,
    padding: 0,
    marginBottom: "8px"
  },
  title: {
    fontSize: "24px",
    fontWeight: 900,
    letterSpacing: "-0.5px"
  },
  sub: {
    fontSize: "13px",
    color: "var(--color-text-muted)"
  },
  container: {
    flex: 1,
    display: "grid",
    gridTemplateColumns: "350px 1fr",
    gap: "20px",
    overflow: "hidden"
  },
  sidebar: {
    background: "var(--color-bg-card)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden"
  },
  filters: {
    display: "flex",
    padding: "10px",
    borderBottom: "1px solid var(--color-border)",
    gap: "6px"
  },
  filterTab: {
    flex: 1,
    padding: "6px 8px",
    borderRadius: "6px",
    border: "none",
    background: "transparent",
    color: "var(--color-text-muted)",
    fontSize: "11px",
    fontWeight: 700,
    cursor: "pointer",
    textAlign: "center",
    textTransform: "uppercase"
  },
  activeFilterTab: {
    background: "var(--color-bg-secondary)",
    color: "var(--color-accent-primary)"
  },
  listContainer: {
    flex: 1,
    overflowY: "auto"
  },
  emptyList: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px",
    color: "var(--color-text-muted)",
    gap: "8px",
    fontSize: "13px"
  },
  msgItem: {
    padding: "14px 16px",
    borderBottom: "1px solid var(--color-border)",
    cursor: "pointer",
    transition: "background 0.2s ease",
    display: "flex",
    flexDirection: "column",
    gap: "6px"
  },
  msgItemSelected: {
    background: "rgba(255, 255, 255, 0.03)"
  },
  msgItemUnread: {
    background: "rgba(59, 130, 246, 0.05)"
  },
  msgMeta: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  senderTag: {
    fontSize: "11px",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  },
  msgDate: {
    fontSize: "10px",
    color: "var(--color-text-muted)"
  },
  msgSubject: {
    fontSize: "13px",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  unreadDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "#3b82f6",
    flexShrink: 0
  },
  msgSnippet: {
    fontSize: "11px",
    color: "var(--color-text-muted)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  },
  actionBadge: {
    alignSelf: "flex-start",
    fontSize: "9px",
    fontWeight: 800,
    background: "rgba(245, 158, 11, 0.15)",
    color: "#f59e0b",
    padding: "2px 6px",
    borderRadius: "4px",
    textTransform: "uppercase",
    marginTop: "4px"
  },
  contentPane: {
    background: "var(--color-bg-card)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column"
  },
  noSelection: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--color-text-muted)",
    gap: "12px",
    fontSize: "14px"
  },
  emailCard: {
    padding: "28px"
  },
  emailHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid var(--color-border)",
    paddingBottom: "18px",
    marginBottom: "20px"
  },
  emailSenderBlock: {
    display: "flex",
    alignItems: "center",
    gap: "12px"
  },
  avatar: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    background: "linear-gradient(135deg, var(--color-accent-primary), var(--color-accent-secondary))",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: "14px",
    color: "#fff"
  },
  emailSenderName: {
    fontSize: "15px",
    fontWeight: 800
  },
  emailRecipient: {
    fontSize: "11px",
    color: "var(--color-text-muted)"
  },
  emailDate: {
    fontSize: "11px",
    color: "var(--color-text-muted)"
  },
  emailSubjectTitle: {
    fontSize: "20px",
    fontWeight: 900,
    marginBottom: "20px",
    letterSpacing: "-0.5px"
  },
  emailBody: {
    fontSize: "14px",
    color: "rgba(255,255,255,0.85)",
    lineHeight: "1.6",
    marginBottom: "30px"
  },
  actionBox: {
    background: "var(--color-bg-secondary)",
    border: "1px solid var(--color-border)",
    borderRadius: "10px",
    padding: "20px"
  },
  actionTitle: {
    fontSize: "13px",
    fontWeight: 800,
    color: "#f59e0b",
    textTransform: "uppercase",
    marginBottom: "14px"
  },
  actionOptionsList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  },
  actionBtn: {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "8px",
    border: "1px solid var(--color-border)",
    background: "var(--color-bg-card)",
    color: "var(--color-text)",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
    textAlign: "left",
    transition: "all 0.2s ease"
  }
};
