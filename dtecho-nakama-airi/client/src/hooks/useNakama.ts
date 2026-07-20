/**
 * React hook for Nakama real-time multiplayer connectivity.
 * Manages connection lifecycle, presence tracking, and match state.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { NakamaService, PresenceInfo, DTEOpCode, NakamaConfig } from "@/lib/nakama-client";

interface UseNakamaOptions {
  config?: Partial<NakamaConfig>;
  autoConnect?: boolean;
  matchName?: string;
}

export function useNakama(options: UseNakamaOptions = {}) {
  const { config, autoConnect = false, matchName = "dtecho-cognitive" } = options;
  const serviceRef = useRef<NakamaService | null>(null);
  const [connected, setConnected] = useState(false);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [presences, setPresences] = useState<PresenceInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const service = new NakamaService(config);
    serviceRef.current = service;

    service.setHandlers({
      onConnect: () => {
        setConnected(true);
        setError(null);
      },
      onDisconnect: () => {
        setConnected(false);
        setMatchId(null);
        setPresences([]);
      },
      onPresenceJoin: () => {
        setPresences([...service.currentPresences]);
      },
      onPresenceLeave: () => {
        setPresences([...service.currentPresences]);
      },
      onError: (err) => {
        setError(err);
        setConnecting(false);
      },
    });

    return () => {
      service.disconnect();
      serviceRef.current = null;
    };
  }, []);

  const connect = useCallback(async (username?: string) => {
    const service = serviceRef.current;
    if (!service || connecting) return false;

    setConnecting(true);
    setError(null);

    const success = await service.connect(username);
    if (success) {
      const mid = await service.joinOrCreateMatch(matchName);
      setMatchId(mid);
      setPresences([...service.currentPresences]);
    }
    setConnecting(false);
    return success;
  }, [matchName, connecting]);

  const disconnect = useCallback(async () => {
    await serviceRef.current?.disconnect();
    setConnected(false);
    setMatchId(null);
    setPresences([]);
  }, []);

  const sendState = useCallback((opCode: DTEOpCode, data: any) => {
    serviceRef.current?.sendMatchData(opCode, data);
  }, []);

  const sendChat = useCallback(async (text: string) => {
    await serviceRef.current?.sendChatMessage(text);
  }, []);

  // Auto-connect if configured
  useEffect(() => {
    if (autoConnect && !connected && !connecting) {
      connect();
    }
  }, [autoConnect]);

  return {
    connected,
    connecting,
    matchId,
    presences,
    error,
    connect,
    disconnect,
    sendState,
    sendChat,
    service: serviceRef.current,
  };
}
