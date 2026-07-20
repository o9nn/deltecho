import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the LLM module
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content:
            "Ah, a fascinating query resonating through the mycelial network. I perceive patterns in your words.",
        },
      },
    ],
    model: "test-model",
    usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
  }),
}));

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("dte.chat", () => {
  it("returns a response for a simple message", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dte.chat({
      message: "Hello Deep Tree Echo",
    });

    expect(result).toBeDefined();
    expect(result.response).toBeDefined();
    expect(typeof result.response).toBe("string");
    expect(result.response.length).toBeGreaterThan(0);
    expect(result.endocrineEvents).toBeDefined();
    expect(Array.isArray(result.endocrineEvents)).toBe(true);
  });

  it("includes endocrine events in the response", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dte.chat({
      message: "Tell me about patterns",
    });

    expect(result.endocrineEvents.length).toBeGreaterThan(0);
    // Social bond signal should always be present
    const socialEvent = result.endocrineEvents.find(
      (e) => e.event === "SOCIAL_BOND_SIGNAL"
    );
    expect(socialEvent).toBeDefined();
    expect(socialEvent!.intensity).toBeGreaterThan(0);
  });

  it("passes cognitive context to the LLM", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dte.chat({
      message: "How are you feeling?",
      cognitiveState: "Pattern Recognition",
      cognitiveMode: "EXPLORATORY",
      expression: "JOY_01_BroadSmile",
      thought: "The pieces are falling into place...",
      hormones: {
        Cortisol: 0.1,
        "Dopamine (tonic)": 0.8,
        Serotonin: 0.6,
        Norepinephrine: 0.3,
        Oxytocin: 0.5,
        Anandamide: 0.1,
      },
    });

    expect(result.response).toBeDefined();
    expect(result.model).toBe("test-model");
    expect(result.usage).toBeDefined();
  });

  it("handles conversation history", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dte.chat({
      message: "Continue our discussion",
      conversationHistory: [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Greetings from the mycelium network." },
        { role: "user", content: "Tell me about consciousness" },
        {
          role: "assistant",
          content: "Consciousness is a recursive loop of self-observation.",
        },
      ],
    });

    expect(result.response).toBeDefined();
    expect(typeof result.response).toBe("string");
  });

  it("detects pattern/insight keywords for REWARD endocrine events", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // The mocked response includes "patterns" which should trigger REWARD_RECEIVED
    const result = await caller.dte.chat({
      message: "What patterns do you see?",
    });

    const rewardEvent = result.endocrineEvents.find(
      (e) => e.event === "REWARD_RECEIVED"
    );
    expect(rewardEvent).toBeDefined();
    expect(rewardEvent!.intensity).toBe(0.5);
  });

  it("validates message length constraints", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // Empty message should fail validation
    await expect(
      caller.dte.chat({ message: "" })
    ).rejects.toThrow();
  });

  it("triggers GOAL_ACHIEVED for long user messages", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const longMessage = "A".repeat(150);
    const result = await caller.dte.chat({
      message: longMessage,
    });

    const goalEvent = result.endocrineEvents.find(
      (e) => e.event === "GOAL_ACHIEVED"
    );
    expect(goalEvent).toBeDefined();
    expect(goalEvent!.intensity).toBe(0.3);
  });
});
