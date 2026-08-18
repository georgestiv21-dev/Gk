import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { MessageSquare, Send, RefreshCw, Zap, CheckCircle2, Copy, Check, Clock, Box, ShieldCheck, User } from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "admin";
  text: string;
  timestamp: number;
}

interface ChatSessionItem {
  sessionId: string;
  licenseKey: string;
  deviceId: string;
  status: "pending" | "active";
  createdAt: number;
  updatedAt: number;
  daysRemaining: number;
  messages: Message[];
}

interface AdminChatManagerProps {
  adminKey: string;
}

export default function AdminChatManager({ adminKey }: AdminChatManagerProps) {
  const [chats, setChats] = useState<ChatSessionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);
  const [activating, setActivating] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isFetchingRef = useRef<boolean>(false);

  const fetchChats = async () => {
    if (isFetchingRef.current) return;
    // Don't poll aggressively if document tab is hidden
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;

    isFetchingRef.current = true;
    try {
      const res = await axios.get(`/api/admin/chats?adminKey=${encodeURIComponent(adminKey)}`, {
        headers: {
          "x-admin-key": adminKey
        }
      });
      setChats(res.data.chats || []);
      if (!selectedSessionId && res.data.chats?.length > 0) {
        setSelectedSessionId(res.data.chats[0].sessionId);
      }
    } catch (err) {
      console.error("Error fetching admin chats:", err);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChats();
    const interval = setInterval(fetchChats, 8000);
    return () => clearInterval(interval);
  }, [adminKey]);

  const selectedChat = chats.find((c) => c.sessionId === selectedSessionId) || chats[0];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedChat?.messages]);

  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!replyText.trim() || !selectedChat || sending) return;

    const textToSend = replyText.trim();
    setReplyText("");
    setSending(true);

    try {
      const res = await axios.post("/api/admin/chat/reply", {
        adminKey,
        sessionId: selectedChat.sessionId,
        text: textToSend
      });
      fetchChats();
    } catch (err) {
      alert("Σφάλμα κατά την αποστολή απάντησης.");
    } finally {
      setSending(false);
    }
  };

  const handleActivateUser = async (days: number = 30) => {
    if (!selectedChat) return;
    if (!confirm(`Θέλετε να ενεργοποιήσετε την πρόσβαση για το Key [${selectedChat.licenseKey}] για +${days} ημέρες;`)) {
      return;
    }

    setActivating(true);
    try {
      const res = await axios.post("/api/admin/chat/activate", {
        adminKey,
        sessionId: selectedChat.sessionId,
        days
      });
      alert(`🎉 Η συνδρομή ενεργοποιήθηκε επιτυχώς για +${days} ημέρες!`);
      fetchChats();
    } catch (err: any) {
      alert(err.response?.data?.error || "Σφάλμα κατά την ενεργοποίηση.");
    } finally {
      setActivating(false);
    }
  };

  const insertBoxNowTemplate = (address: string) => {
    setReplyText(`📦 Οδηγίες Κατάθεσης BoxNow:\nΠαρακαλώ τοποθετήστε το ποσό στη Θυρίδα BoxNow #${address}.\n\nΜόλις την τοποθετήσετε, στείλτε μας μήνυμα εδώ για να ενεργοποιήσουμε την πρόσβασή σας αμέσως!`);
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-gray-400 flex items-center justify-center gap-2 font-bold">
        <RefreshCw className="w-5 h-5 animate-spin text-primary" />
        Φόρτωση ανώνυμων συνομιλιών...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px]">
      {/* Left Sidebar: List of Customer Chats */}
      <div className="bg-panel rounded-3xl border border-gray-800 flex flex-col overflow-hidden shadow-xl">
        <div className="p-4 bg-dark border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-white text-sm">Αιτήματα BoxNow ({chats.length})</h3>
          </div>
          <button
            onClick={fetchChats}
            className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
            title="Ανανέωση"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-800/60">
          {chats.map((c) => {
            const isSelected = c.sessionId === selectedChat?.sessionId;
            const isPending = c.status === "pending";
            const lastMsg = c.messages[c.messages.length - 1];

            return (
              <div
                key={c.sessionId}
                onClick={() => setSelectedSessionId(c.sessionId)}
                className={`p-4 cursor-pointer transition-all hover:bg-white/5 flex flex-col gap-1.5 ${
                  isSelected ? "bg-primary/10 border-l-4 border-primary" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-white truncate max-w-[140px]">
                    {c.licenseKey}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      isPending
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse"
                        : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    }`}
                  >
                    {isPending ? "🔴 Αναμονή" : "🟢 Ενεργός"}
                  </span>
                </div>

                <p className="text-xs text-gray-400 line-clamp-1 italic">
                  {lastMsg ? `${lastMsg.sender === "admin" ? "Εσείς: " : ""}${lastMsg.text}` : "Καμία συνομιλία"}
                </p>

                <div className="flex items-center justify-between text-[10px] text-gray-500 mt-1">
                  <span>{new Date(c.updatedAt).toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" })}</span>
                  <span>{c.messages.length} μηνύματα</span>
                </div>
              </div>
            );
          })}

          {chats.length === 0 && (
            <div className="p-8 text-center text-xs text-gray-500">
              Δεν υπάρχουν ακόμη ενεργές συνομιλίες.
            </div>
          )}
        </div>
      </div>

      {/* Right Area: Active Chat Window & Activation Action */}
      <div className="md:col-span-2 bg-panel rounded-3xl border border-gray-800 flex flex-col overflow-hidden shadow-2xl">
        {selectedChat ? (
          <>
            {/* Header with Quick Activation Controls */}
            <div className="p-4 bg-dark border-b border-gray-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-black text-amber-400">{selectedChat.licenseKey}</span>
                  <button
                    onClick={() => copyKey(selectedChat.licenseKey)}
                    className="p-1 hover:bg-gray-800 text-gray-400 hover:text-white rounded transition-colors"
                    title="Αντιγραφή Key"
                  >
                    {copiedKey === selectedChat.licenseKey ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
                  <span>Συσκευή: {selectedChat.deviceId}</span>
                  &bull;
                  <span>
                    Κατάσταση:{" "}
                    <strong className={selectedChat.status === "pending" ? "text-amber-400" : "text-emerald-400"}>
                      {selectedChat.status === "pending" ? "Σε Αναμονή" : `Ενεργός (${selectedChat.daysRemaining} μέρες)`}
                    </strong>
                  </span>
                </p>
              </div>

              {/* ACTION BUTTON: ACTIVATE USER */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleActivateUser(30)}
                  disabled={activating}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-extrabold text-xs rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer"
                >
                  {activating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  <span>⚡ Ενεργοποίηση (+30 Ημέρες)</span>
                </button>
                <button
                  onClick={() => handleActivateUser(365)}
                  disabled={activating}
                  className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-amber-400 font-bold text-xs rounded-xl transition-colors border border-gray-700 cursor-pointer"
                >
                  +1 Έτος
                </button>
              </div>
            </div>

            {/* Template Quick Actions */}
            <div className="px-4 py-2 bg-darker/60 border-b border-gray-800/80 flex items-center gap-2 overflow-x-auto text-xs">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider shrink-0">
                Πρότυπα BoxNow:
              </span>
              <button
                type="button"
                onClick={() => insertBoxNowTemplate("4812 - Λεωφ. Κηφισίας 120")}
                className="px-2.5 py-1 bg-panel hover:bg-gray-800 text-gray-300 rounded-lg border border-gray-800 shrink-0 text-[11px] cursor-pointer"
              >
                📍 Θυρίδα #4812
              </button>
              <button
                type="button"
                onClick={() => insertBoxNowTemplate("2901 - Λεωφ. Συγγρού 210")}
                className="px-2.5 py-1 bg-panel hover:bg-gray-800 text-gray-300 rounded-lg border border-gray-800 shrink-0 text-[11px] cursor-pointer"
              >
                📍 Θυρίδα #2901
              </button>
            </div>

            {/* Messages Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-darker/40">
              {selectedChat.messages.map((m) => {
                const isAdmin = m.sender === "admin";
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isAdmin ? "items-end" : "items-start"}`}
                  >
                    <span className="text-[10px] text-gray-500 mb-0.5 px-1">
                      {isAdmin ? "Εσείς (Admin)" : "Χρήστης"} &bull; {new Date(m.timestamp).toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <div
                      className={`max-w-[80%] p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                        isAdmin
                          ? "bg-primary text-white font-medium rounded-tr-none shadow-md shadow-primary/10"
                          : "bg-panel text-gray-200 border border-gray-800 rounded-tl-none"
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Input Form */}
            <form onSubmit={handleSendReply} className="p-3 bg-dark border-t border-gray-800 flex items-center gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Απαντήστε στον χρήστη..."
                className="flex-1 bg-darker border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
              />
              <button
                type="submit"
                disabled={!replyText.trim() || sending}
                className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {sending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Αποστολή</span>
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-xs">
            Επιλέξτε μια συνομιλία από την αριστερή λίστα.
          </div>
        )}
      </div>
    </div>
  );
}
