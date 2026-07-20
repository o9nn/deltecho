/**
 * React hook for the DTE Cognitive Engine
 * Manages the cognitive state machine lifecycle and provides reactive state.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { DTECognitiveEngine, CognitiveSnapshot, DTEState, DTEExpression } from "@/lib/cognitive";
import { CognitiveMode, EndocrineEvent } from "@/lib/endocrine";

export function useCognitiveEngine(autoRunInterval: number = 2500) {
  const engineRef = useRef<DTECognitiveEngine | null>(null);
  const [snapshot, setSnapshot] = useState<CognitiveSnapshot>({
    state: DTEState.IDLE,
    expression: DTEExpression.PHOTO_UPWARD,
    mode: CognitiveMode.RESTING,
    thought: "Initializing cognitive systems...",
    hormones: {},
    timestamp: Date.now(),
  });
  const [isRunning, setIsRunning] = useState(false);
  const [stateHistory, setStateHistory] = useState<CognitiveSnapshot[]>([]);

  useEffect(() => {
    const engine = new DTECognitiveEngine();
    engineRef.current = engine;

    engine.onStateChange((snap) => {
      setSnapshot(snap);
      setStateHistory((prev) => [...prev.slice(-50), snap]);
    });

    return () => {
      engine.stopAutoRun();
      engineRef.current = null;
    };
  }, []);

  const start = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.startAutoRun(autoRunInterval);
      setIsRunning(true);
    }
  }, [autoRunInterval]);

  const stop = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.stopAutoRun();
      setIsRunning(false);
    }
  }, []);

  const step = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.step();
    }
  }, []);

  const triggerEvent = useCallback((event: EndocrineEvent, intensity?: number) => {
    if (engineRef.current) {
      engineRef.current.triggerExternalEvent(event, intensity);
    }
  }, []);

  const triggerSpeaking = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.triggerSpeaking();
    }
  }, []);

  const reset = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.reset();
      setIsRunning(false);
      setStateHistory([]);
      setSnapshot({
        state: DTEState.IDLE,
        expression: DTEExpression.PHOTO_UPWARD,
        mode: CognitiveMode.RESTING,
        thought: "Systems reset.",
        hormones: {},
        timestamp: Date.now(),
      });
    }
  }, []);

  const getHormoneHistory = useCallback(() => {
    return engineRef.current?.getEndocrine().getHistory() || [];
  }, []);

  const getEndocrine = useCallback(() => {
    return engineRef.current?.getEndocrine() ?? null;
  }, []);

  return {
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
  };
}
