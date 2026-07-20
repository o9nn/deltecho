/**
 * ChatPanel — Chat interface for interacting with the DTE avatar.
 * Uses tRPC to call the LLM-powered DTE chat endpoint.
 * Messages trigger endocrine events and cognitive state changes.
 * Design: Bioluminescent Mycorrhizal Interface
 */

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EndocrineEvent } from "@/lib/endocrine";
import { trpc } from "@/lib/trpc";

interface ChatMessage {
  id: string;
  sender: "user" | "dte";
  text: string;
  timestamp: number;
  emotion?: string;
  model?: string;
}

interface ChatPanelProps {
  onSendMessage: (message: string) => void;
  onTriggerEvent: (event: EndocrineEvent, intensity?: number) => void;
  currentThought: string;
  currentMode: string;
  cognitiveState?: string;
  expression?: string;
  hormones?: Record<string, number>;
}

// Map string event names back to EndocrineEvent enum
const EVENT_MAP: Record<string, EndocrineEvent> = {
  REWARD_RECEIVED: EndocrineEvent.REWARD_RECEIVED,
  GOAL_ACHIEVED: EndocrineEvent.GOAL_ACHIEVED,
  THREAT_DETECTED: EndocrineEvent.THREAT_DETECTED,
  NOVELTY_ENCOUNTERED: EndocrineEvent.NOVELTY_ENCOUNTERED,
  SOCIAL_BOND_SIGNAL: EndocrineEvent.SOCIAL_BOND_SIGNAL,
  ERROR_DETECTED: EndocrineEvent.ERROR_DETECTED,
  NOISE_EXCESSIVE: EndocrineEvent.NOISE_EXCESSIVE,
  RESOURCE_DEPLETED: EndocrineEvent.RESOURCE_DEPLETED,
  LIGHT_SIGNAL: EndocrineEvent.LIGHT_SIGNAL,
};

export default function ChatPanel({
  onSendMessage,
  onTriggerEvent,
  currentThought,
  currentMode,
  cognitiveState,
  expression,
  hormones,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init",
      sender: "dte",
      text: "Cognitive systems online. The mycelium network is listening...",
      timestamp: Date.now(),
      emotion: "RESTING",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const chatMutation = trpc.dte.chat.useMutation();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userText = input.trim();
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      sender: "user",
      text: userText,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    onSendMessage(userText);
    onTriggerEvent(EndocrineEvent.SOCIAL_BOND_SIGNAL, 0.4);

    // Build conversation history for context
    const conversationHistory = messages
      .filter((m) => m.id !== "init")
      .map((m) => ({
        role: m.sender === "user" ? ("user" as const) : ("assistant" as const),
        content: m.text,
      }));

    try {
      const result = await chatMutation.mutateAsync({
        message: userText,
        cognitiveState: cognitiveState,
        cognitiveMode: currentMode,
        expression: expression,
        thought: currentThought,
        hormones: hormones,
        conversationHistory,
      });

      const dteMsg: ChatMessage = {
        id: crypto.randomUUID(),
        sender: "dte",
        text: result.response,
        timestamp: Date.now(),
        emotion: currentMode,
        model: result.model,
      };
      setMessages((prev) => [...prev, dteMsg]);

      // Apply endocrine feedback from the LLM response analysis
      if (result.endocrineEvents) {
        for (const evt of result.endocrineEvents) {
          const endoEvent = EVENT_MAP[evt.event];
          if (endoEvent) {
            onTriggerEvent(endoEvent, evt.intensity);
          }
        }
      }
    } catch (err) {
      // Fallback response on error
      const dteMsg: ChatMessage = {
        id: crypto.randomUUID(),
        sender: "dte",
        text: "The neural pathways are experiencing interference... try again.",
        timestamp: Date.now(),
        emotion: "STRESSED",
        model: "error",
      };
      setMessages((prev) => [...prev, dteMsg]);
      onTriggerEvent(EndocrineEvent.ERROR_DETECTED, 0.3);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="glass-panel flex flex-col h-full">
      <div className="p-3 border-b border-border/30 flex items-center justify-between">
        <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-dte-teal/70">
          Neural Chat
        </h3>
        <span className="text-[8px] font-mono text-dte-teal/30">
          LLM-Powered
        </span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] px-3 py-2 rounded-lg text-xs font-mono leading-relaxed ${
                  msg.sender === "user"
                    ? "bg-dte-teal/15 text-dte-teal border border-dte-teal/20"
                    : "bg-dte-amber/10 text-dte-amber/90 border border-dte-amber/15"
                }`}
              >
                {msg.sender === "dte" && (
                  <span className="text-[9px] opacity-50 block mb-0.5">DTE</span>
                )}
                {msg.text}
                {msg.sender === "dte" && (
                  <div className="flex items-center gap-2 mt-1">
                    {msg.emotion && (
                      <span className="text-[8px] opacity-30">[{msg.emotion}]</span>
                    )}
                    {msg.model && msg.model !== "fallback" && msg.model !== "error" && (
                      <span className="text-[7px] opacity-20">{msg.model}</span>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-dte-amber/10 border border-dte-amber/15 rounded-lg px-3 py-2">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-dte-amber/50"
                    animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border/30">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Speak to the echo..."
            disabled={isTyping}
            className="flex-1 bg-transparent border border-border/40 rounded-md px-3 py-1.5 text-xs font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-dte-teal/50 focus:ring-1 focus:ring-dte-teal/20 transition-colors disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={isTyping || !input.trim()}
            className="px-3 py-1.5 rounded-md bg-dte-teal/15 text-dte-teal text-xs font-mono border border-dte-teal/30 hover:bg-dte-teal/25 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {isTyping ? "..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
