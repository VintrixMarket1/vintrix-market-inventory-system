import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare, X, Send, Sparkles, User, Bot } from "lucide-react";

export default function AiChatAssistant({ product, listing, onClose }) {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Cześć! Jestem Twoim asystentem AI. Pomogę Ci zweryfikować i ulepszyć ten produkt. Co chciałbyś sprawdzić lub zmienić?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const prompt = `Jesteś ekspertem e-commerce pomagającym sprzedawcy zweryfikować i ulepszyć listing produktu.

DANE PRODUKTU:
${product ? JSON.stringify(product, null, 2) : "Brak danych produktu"}

DANE LISTINGU:
${listing ? JSON.stringify(listing, null, 2) : "Brak danych listingu"}

PYTANIE UŻYTKOWNIKA: ${userMessage}

Twoje zadania:
1. Analizuj produkt pod kątem: poprawności kategorii, stanu, ceny, opisu, zdjęć
2. Wykrywaj potencjalne błędy lub niezgodności
3. Sugeruj konkretne zmiany i ulepszenia
4. Odpowiadaj na pytania dotyczące optymalizacji sprzedaży
5. Bądź konkretny - jeśli coś jest nie tak, wskaż co dokładnie i jak to naprawić

ODPOWIEDZ W JĘZYKU POLSKIM. Bądź przyjazny, ale profesjonalny.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        model: "gpt_5_5",
      });

      setMessages(prev => [...prev, { role: "assistant", content: result }]);
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
    <div className="fixed right-0 top-0 h-full w-96 bg-white border-l shadow-2xl flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          <div>
            <h3 className="font-semibold text-sm">Asystent AI</h3>
            <p className="text-xs text-emerald-100">Pomoże Ci zweryfikować produkt</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
        {messages.map((msg, i) => (
          <div key={i} className={`flex items-start gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === "user" ? "bg-blue-500" : "bg-emerald-500"
            }`}>
              {msg.role === "user" ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
            </div>
            <div className={`max-w-[80%] rounded-lg p-3 text-sm ${
              msg.role === "user" 
                ? "bg-blue-500 text-white" 
                : "bg-white border border-slate-200 text-slate-800"
            }`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
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
      <div className="p-4 border-t bg-white">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Napisz wiadomość..."
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
          AI może popełniać błędy - zawsze weryfikuj sugestie
        </p>
      </div>
    </div>
  );
}