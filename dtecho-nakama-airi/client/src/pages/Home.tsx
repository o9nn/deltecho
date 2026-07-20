/**
 * Home — Main DTEcho Dashboard
 * Asymmetric three-column layout:
 * Left: Avatar display (dominant) + Controls
 * Center: Cognitive state + Echobeat + Hormones + Waveform
 * Right: Chat + Presence
 * 
 * Design: Bioluminescent Mycorrhizal Interface
 */

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useCognitiveEngine } from "@/hooks/useCognitiveEngine";
import { useNakama } from "@/hooks/useNakama";
import { EndocrineEvent } from "@/lib/endocrine";
import { DTEOpCode } from "@/lib/nakama-client";
import MyceliumBackground from "@/components/MyceliumBackground";
import AvatarDisplay from "@/components/AvatarDisplay";
import CognitiveStatePanel from "@/components/CognitiveStatePanel";
import HormonePanel from "@/components/HormonePanel";
import HormoneWaveform from "@/components/HormoneWaveform";
import EchobeatCycle from "@/components/EchobeatCycle";
import ChatPanel from "@/components/ChatPanel";
import PresencePanel from "@/components/PresencePanel";
import ControlPanel from "@/components/ControlPanel";

export default function Home() {
  const {
    snapshot,
    isRunning,
    stateHistory,
    start,
    stop,
    step,
    triggerEvent,
    triggerSpeaking,
    reset,
    getHormoneHistory,
    getEndocrine,
  } = useCognitiveEngine(2500);

  const endocrine = getEndocrine();

  const {
    connected: nakamaConnected,
    connecting: nakamaConnecting,
    matchId,
    presences,
    error: nakamaError,
    connect: nakamaConnect,
    disconnect: nakamaDisconnect,
    sendState,
  } = useNakama();

  const [hormoneHistory, setHormoneHistory] = useState<Array<{ time: number; hormones: number[] }>>([]);

  useEffect(() => {
    setHormoneHistory(getHormoneHistory());
  }, [snapshot, getHormoneHistory]);

  // Auto-start cognitive engine
  useEffect(() => {
    const timer = setTimeout(() => start(), 1500);
    return () => clearTimeout(timer);
  }, [start]);

  // Broadcast cognitive state to Nakama when connected
  useEffect(() => {
    if (nakamaConnected && snapshot) {
      sendState(DTEOpCode.COGNITIVE_STATE, {
        state: snapshot.state,
        mode: snapshot.mode,
        expression: snapshot.expression,
        thought: snapshot.thought,
      });
    }
  }, [snapshot, nakamaConnected, sendState]);

  const handleSendMessage = useCallback((_msg: string) => {
    triggerSpeaking();
  }, [triggerSpeaking]);

  const handleTriggerEvent = useCallback((event: EndocrineEvent, intensity?: number) => {
    triggerEvent(event, intensity);
  }, [triggerEvent]);

  return (
    <div className="h-screen relative overflow-hidden flex flex-col">
      <MyceliumBackground />

      {/* Header */}
      <header className="relative z-20 flex items-center justify-between px-6 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <motion.div
            className="w-2 h-2 rounded-full bg-dte-teal"
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <h1 className="text-sm font-display font-bold tracking-wider text-foreground/90">
            DTEcho
          </h1>
          <span className="text-[10px] font-mono text-dte-teal/40 tracking-widest uppercase hidden sm:inline">
            Deep Tree Echo
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-mono text-muted-foreground/40 hidden md:inline">
            Nakama × Airi × VES
          </span>
          <div className="flex items-center gap-1.5">
            <motion.div
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: isRunning ? "#00ffd5" : "#ff9f43" }}
              animate={{ opacity: isRunning ? [0.5, 1, 0.5] : 0.5 }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-[9px] font-mono text-muted-foreground/40">
              {isRunning ? "LIVE" : "PAUSED"}
            </span>
          </div>
          {nakamaConnected && (
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-dte-teal animate-pulse" />
              <span className="text-[8px] font-mono text-dte-teal/40">NAKAMA</span>
            </div>
          )}
        </div>
      </header>

      {/* Dashboard Grid */}
      <main className="relative z-20 flex-1 px-4 pb-3 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0 overflow-hidden">
        {/* Left Column — Avatar + Controls (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-3 min-h-0">
          <motion.div
            className="flex-1 flex items-center justify-center min-h-0"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <AvatarDisplay snapshot={snapshot} endocrine={endocrine} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="shrink-0"
          >
            <ControlPanel
              isRunning={isRunning}
              onStart={start}
              onStop={stop}
              onStep={step}
              onReset={reset}
              onTriggerEvent={handleTriggerEvent}
            />
          </motion.div>
        </div>

        {/* Center Column — Cognitive + Echobeat + Hormones (3 cols) */}
        <div className="lg:col-span-3 flex flex-col gap-3 min-h-0 overflow-y-auto scrollbar-thin">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <CognitiveStatePanel snapshot={snapshot} stateHistory={stateHistory} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <EchobeatCycle currentState={snapshot.state} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <HormonePanel hormones={snapshot.hormones} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <HormoneWaveform history={hormoneHistory} />
          </motion.div>
        </div>

        {/* Right Column — Chat + Presence (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-3 min-h-0">
          <motion.div
            className="flex-1 min-h-0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <ChatPanel
              onSendMessage={handleSendMessage}
              onTriggerEvent={handleTriggerEvent}
              currentThought={snapshot.thought}
              currentMode={snapshot.mode}
              cognitiveState={snapshot.state}
              expression={snapshot.expression}
              hormones={snapshot.hormones}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="shrink-0"
          >
            <PresencePanel
              presences={presences}
              connected={nakamaConnected}
              connecting={nakamaConnecting}
              matchId={matchId}
              error={nakamaError}
              onConnect={() => nakamaConnect()}
              onDisconnect={nakamaDisconnect}
            />
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-20 px-6 py-2 flex items-center justify-between shrink-0">
        <span className="text-[8px] font-mono text-muted-foreground/25">
          live2d-dtecho [ live2d-miara → ( nakama, airi ) ]
        </span>
        <span className="text-[8px] font-mono text-muted-foreground/25">
          Tick #{stateHistory.length}
        </span>
      </footer>
    </div>
  );
}
