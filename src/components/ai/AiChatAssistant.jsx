import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, X, Send, Sparkles, User, Bot, CheckCircle, XCircle, Pencil, Trash2 } from "lucide-react";

const FIELD_LABELS = {
  listing_title: "Tytuł oferty",
  listing_description: "Opis oferty",
  listing_price: "Cena (PLN)",
  product_name: "Nazwa produktu",
  notes: "Notatki",
  suggested_sale_price: "Sugerowana cena sprzedaży",
};

function ActionCard({ action, onApply, onDismiss, applying }) {
  const label = FIELD_LABELS[action.field] || action.field;
  const isLong = typeof action.value === "string" && action.value.length > 100;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2 text-xs">
      <div className="flex items-center gap-1.5 font-semibold text-amber-800">
        <Pencil className="w-3 h-3" />
        Proponowana zmiana: <span className="text-slate-700">{label}</span>
      </div>
      <div className="bg-white border border-amber-100 rounded p-2 text-slate-700 max-h-32 overflow-y-auto">
        {isLong ? (
          <pre className="whitespace-pre-wrap text-[11px] font-mono">{action.value}</pre>
        ) : (
          <span>{String(action.value)}</span>
        )}
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onApply(action)} disabled={applying}
          className="h-7 text-xs gap-1 bg-emerald-500 hover:bg-emerald-600 text-white flex-1">
          {applying ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
          Zastosuj
        </Button>
        <Button size="sm" variant="outline" onClick={() => onDismiss(action)} disabled={applying}
          className="h-7 text-xs gap-1 flex-1">
          <XCircle className="w-3 h-3" /> Odrzuć
        </Button>
      </div>
    </div>
  );
}

const INITIAL_MESSAGE = { role: "assistant", content: 'Cześć! Jestem Twoim asystentem AI. Mogę analizować produkt, sugerować zmiany i **od razu je zapisywać** — wystarczy kliknąć "Zastosuj". Co chcesz sprawdzić lub zmienić?' };

export default function AiChatAssistant({ product, listing, onClose, onDataChanged }) {
  const storageKey = `ai_chat_${product?.id || "global"}_${listing?.id || "nolisting"}`;

  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [INITIAL_MESSAGE];
    } catch { return [INITIAL_MESSAGE]; }
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [applyingAction, setApplyingAction] = useState(null);
  const [dismissedActions, setDismissedActions] = useState(new Set());
  const messagesEndRef = useRef(null);

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(messages)); } catch {}
  }, [messages, storageKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const applyAction = async (action) => {
    setApplyingAction(action.id);
    try {
      const isListingField = ["listing_title", "listing_description", "listing_price"].includes(action.field);
      const isProductField = ["product_name", "notes", "suggested_sale_price"].includes(action.field);

      if (isListingField && listing?.id) {
        await base44.entities.Listing.update(listing.id, { [action.field]: action.value });
      } else if (isProductField && product?.id) {
        await base44.entities.Product.update(product.id, { [action.field]: action.value });
      }

      // Mark action as applied
      setMessages(prev => prev.map(msg => {
        if (!msg.actions) return msg;
        return {
          ...msg,
          actions: msg.actions.map(a => a.id === action.id ? { ...a, applied: true } : a)
        };
      }));

      if (onDataChanged) onDataChanged();

      setMessages(prev => [...prev, {
        role: "assistant",
        content: `✅ Zmieniono **${FIELD_LABELS[action.field] || action.field}** — zapisano w systemie.`
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `❌ Nie udało się zapisać zmiany: ${err.message}`
      }]);
    } finally {
      setApplyingAction(null);
    }
  };

  const dismissAction = (action) => {
    setDismissedActions(prev => new Set([...prev, action.id]));
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const prompt = `Jesteś ekspertem e-commerce pomagającym sprzedawcy zoptymalizować listing produktu.

DANE PRODUKTU:
${product ? JSON.stringify(product, null, 2) : "Brak danych produktu"}

DANE LISTINGU:
${listing ? JSON.stringify(listing, null, 2) : "Brak danych listingu"}

PYTANIE/POLECENIE UŻYTKOWNIKA: ${userMessage}

TWOJE ZADANIA:
1. Odpowiedz na pytanie lub wykonaj polecenie użytkownika
2. Jeśli użytkownik prosi o konkretne zmiany (np. "popraw tytuł", "zmień opis", "ustaw cenę"), zwróć je w polu "actions"
3. Możesz zaproponować zmiany nawet bez wyraźnej prośby, jeśli wykryjesz błędy
4. Bądź konkretny — podaj dokładną nową wartość, nie ogólniki

Dostępne pola do modyfikacji:
- "listing_title" — tytuł oferty na platformie
- "listing_description" — opis oferty (HTML jest ok)
- "listing_price" — cena sprzedaży (liczba)
- "product_name" — nazwa produktu w magazynie
- "notes" — notatki do produktu
- "suggested_sale_price" — sugerowana cena sprzedaży (liczba)

ODPOWIEDŹ musi być w formacie JSON:
{
  "message": "Twoja odpowiedź w języku polskim (markdown ok)",
  "actions": [
    {
      "field": "listing_title",
      "value": "Nowa wartość pola",
      "reason": "Krótkie uzasadnienie"
    }
  ]
}

Jeśli nie ma żadnych zmian do zaproponowania, zwróć "actions": [].
ZAWSZE odpowiadaj po polsku.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            message: { type: "string" },
            actions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  field: { type: "string" },
                  value: {},
                  reason: { type: "string" }
                }
              }
            }
          }
        },
        model: "gpt_5_5",
      });

      const actions = (result.actions || []).map((a, i) => ({
        ...a,
        id: `${Date.now()}-${i}`,
        applied: false,
      }));

      setMessages(prev => [...prev, {
        role: "assistant",
        content: result.message || result,
        actions: actions.length > 0 ? actions : undefined,
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: "Przepraszam, wystąpił błąd. Spróbuj ponownie." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fixed right-0 top-0 h-full w-[420px] bg-white border-l shadow-2xl flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-emerald-500 to-teal-500 text-white shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          <div>
            <h3 className="font-semibold text-sm">Asystent AI</h3>
            <p className="text-xs text-emerald-100">Może wprowadzać zmiany bezpośrednio w systemie</p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" title="Wyczyść historię" onClick={() => { setMessages([INITIAL_MESSAGE]); setDismissedActions(new Set()); }} className="text-white hover:bg-white/20">
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
        {messages.map((msg, i) => (
          <div key={i}>
            <div className={`flex items-start gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === "user" ? "bg-blue-500" : "bg-emerald-500"
              }`}>
                {msg.role === "user" ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
              </div>
              <div className={`max-w-[85%] rounded-lg p-3 text-sm ${
                msg.role === "user"
                  ? "bg-blue-500 text-white"
                  : "bg-white border border-slate-200 text-slate-800"
              }`}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>

            {/* Action cards */}
            {msg.actions && msg.actions.length > 0 && (
              <div className="ml-9 mt-2 space-y-2">
                {msg.actions.map(action => {
                  if (action.applied) {
                    return (
                      <div key={action.id} className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span><b>{FIELD_LABELS[action.field] || action.field}</b> — zmiana zapisana</span>
                      </div>
                    );
                  }
                  if (dismissedActions.has(action.id)) return null;
                  return (
                    <ActionCard
                      key={action.id}
                      action={action}
                      onApply={applyAction}
                      onDismiss={dismissAction}
                      applying={applyingAction === action.id}
                    />
                  );
                })}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            AI myśli...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-white shrink-0">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="np. popraw tytuł, zmień cenę na 49 zł..."
            disabled={loading}
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="bg-emerald-500 hover:bg-emerald-600 text-white shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-[10px] text-slate-400 mt-2 text-center">
          AI może wprowadzać zmiany — zawsze możesz odrzucić propozycję
        </p>
      </div>
    </div>
  );
}