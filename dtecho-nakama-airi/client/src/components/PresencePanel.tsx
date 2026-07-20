/**
 * PresencePanel — Shows connected users and Nakama connection status.
 * Includes connect/disconnect controls.
 * Design: Bioluminescent Mycorrhizal Interface
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { PresenceInfo } from "@/lib/nakama-client";

interface PresencePanelProps {
  presences: PresenceInfo[];
  connected: boolean;
  connecting?: boolean;
  matchId: string | null;
  error?: string | null;
  onConnect?: (username?: string) => void;
  onDisconnect?: () => void;
}

export default function PresencePanel({
  presences,
  connected,
  connecting = false,
  matchId,
  error,
  onConnect,
  onDisconnect,
}: PresencePanelProps) {
  const [nakamaHost, setNakamaHost] = useState("127.0.0.1:7350");

  return (
    <div className="glass-panel p-4 space-y-3">
      <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-dte-teal/70">
        Nakama Network
      </h3>

      {/* Connection Status */}
      <div className="flex items-center gap-2">
        <motion.div
          className="w-2 h-2 rounded-full"
          style={{
            backgroundColor: connected ? "#00ffd5" : connecting ? "#ff9f43" : "#ff6b6b",
            boxShadow: connected ? "0 0 8px #00ffd580" : "none",
          }}
          animate={{ scale: connected ? [1, 1.3, 1] : connecting ? [1, 1.2, 1] : 1 }}
          transition={{ duration: connected ? 2 : 0.5, repeat: Infinity }}
        />
        <span className="text-xs font-mono" style={{
          color: connected ? "#00ffd5" : connecting ? "#ff9f43" : "#ff6b6b"
        }}>
          {connected ? "Connected" : connecting ? "Connecting..." : "Offline — Local Mode"}
        </span>
      </div>

      {/* Connect/Disconnect controls */}
      {!connected && !connecting && (
        <div className="space-y-2">
          <input
            type="text"
            value={nakamaHost}
            onChange={(e) => setNakamaHost(e.target.value)}
            placeholder="host:port"
            className="w-full bg-transparent border border-border/40 rounded-md px-2 py-1 text-[10px] font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-dte-teal/50"
          />
          <button
            onClick={() => onConnect?.()}
            className="w-full px-2 py-1 rounded-md bg-dte-teal/15 text-dte-teal text-[10px] font-mono border border-dte-teal/30 hover:bg-dte-teal/25 transition-colors"
          >
            Connect to Nakama
          </button>
        </div>
      )}

      {connected && (
        <button
          onClick={() => onDisconnect?.()}
          className="w-full px-2 py-1 rounded-md bg-red-500/10 text-red-400 text-[10px] font-mono border border-red-500/20 hover:bg-red-500/20 transition-colors"
        >
          Disconnect
        </button>
      )}

      {/* Error */}
      {error && (
        <div className="text-[9px] font-mono text-red-400/70 bg-red-500/5 rounded px-2 py-1 border border-red-500/10">
          {error}
        </div>
      )}

      {/* Match ID */}
      {matchId && (
        <div className="text-[10px] font-mono text-muted-foreground opacity-50 truncate">
          Match: {matchId.slice(0, 16)}...
        </div>
      )}

      {/* Presence List */}
      <div className="space-y-1">
        {presences.length > 0 ? (
          presences.map((p) => (
            <motion.div
              key={p.sessionId || p.userId}
              className="flex items-center gap-2 py-1"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-dte-teal" />
              <span className="text-xs font-mono text-foreground/80">{p.username}</span>
              {p.cognitiveState && (
                <span className="text-[8px] font-mono text-dte-amber/40 ml-auto">{p.cognitiveState}</span>
              )}
            </motion.div>
          ))
        ) : (
          <div className="text-[10px] font-mono text-muted-foreground opacity-40">
            {connected ? "No other participants" : "Start Nakama server to enable multiplayer"}
          </div>
        )}
      </div>

      {/* Simulated presences for demo (offline only) */}
      {!connected && (
        <div className="space-y-1 mt-2 pt-2 border-t border-border/30">
          <div className="text-[10px] font-mono text-dte-teal/40 uppercase tracking-wider mb-1">
            Simulated Observers
          </div>
          {["dte_echo_01", "dte_observer", "dte_mirror"].map((name, i) => (
            <motion.div
              key={name}
              className="flex items-center gap-2 py-0.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              transition={{ delay: i * 0.2 }}
            >
              <motion.div
                className="w-1.5 h-1.5 rounded-full bg-dte-amber/50"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
              />
              <span className="text-[10px] font-mono text-foreground/30">{name}</span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
