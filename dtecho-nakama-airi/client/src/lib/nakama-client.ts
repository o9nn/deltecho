/**
 * Nakama Client Service
 * Wraps @heroiclabs/nakama-js for WebSocket communication,
 * match management, chat, and real-time state synchronization.
 * 
 * Derived from: ReZorg/nakama integration
 */

import { Client, Session, Socket } from "@heroiclabs/nakama-js";

export enum DTEOpCode {
  COGNITIVE_STATE = 1,
  ENDOCRINE_UPDATE = 2,
  EXPRESSION_CHANGE = 3,
  CHAT_MESSAGE = 4,
  PRESENCE_UPDATE = 5,
}

export interface NakamaConfig {
  host: string;
  port: string;
  serverKey: string;
  useSSL: boolean;
}

export interface PresenceInfo {
  userId: string;
  username: string;
  sessionId: string;
  status: string;
  cognitiveState?: string;
  cognitiveMode?: string;
}

export type NakamaEventHandler = {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onPresenceJoin?: (presences: PresenceInfo[]) => void;
  onPresenceLeave?: (presences: PresenceInfo[]) => void;
  onMatchState?: (opCode: number, data: any, senderId: string) => void;
  onChatMessage?: (senderId: string, username: string, content: string) => void;
  onError?: (error: string) => void;
};

const DEFAULT_CONFIG: NakamaConfig = {
  host: "127.0.0.1",
  port: "7350",
  serverKey: "defaultkey",
  useSSL: false,
};

export class NakamaService {
  private client: Client;
  private session: Session | null = null;
  private socket: Socket | null = null;
  private matchId: string | null = null;
  private chatChannelId: string | null = null;
  private presences: Map<string, PresenceInfo> = new Map();
  private handlers: NakamaEventHandler = {};
  private _connected = false;

  constructor(config: Partial<NakamaConfig> = {}) {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    this.client = new Client(cfg.serverKey, cfg.host, cfg.port, cfg.useSSL);
  }

  get connected(): boolean {
    return this._connected;
  }

  get currentMatchId(): string | null {
    return this.matchId;
  }

  get currentPresences(): PresenceInfo[] {
    return Array.from(this.presences.values());
  }

  setHandlers(handlers: NakamaEventHandler) {
    this.handlers = handlers;
  }

  async connect(username?: string): Promise<boolean> {
    try {
      // Authenticate with device ID (anonymous, persistent)
      const deviceId = this.getOrCreateDeviceId();
      const name = username || `dte_${deviceId.slice(0, 6)}`;
      this.session = await this.client.authenticateDevice(deviceId, true, name);

      // Create WebSocket
      this.socket = this.client.createSocket(false, false);

      this.socket.ondisconnect = () => {
        this._connected = false;
        this.handlers.onDisconnect?.();
      };

      this.socket.onmatchpresence = (event) => {
        if (event.joins) {
          const joins: PresenceInfo[] = event.joins.map((p: any) => ({
            userId: p.user_id,
            username: p.username,
            sessionId: p.session_id,
            status: "online",
          }));
          for (const j of joins) this.presences.set(j.userId, j);
          this.handlers.onPresenceJoin?.(joins);
        }
        if (event.leaves) {
          const leaves: PresenceInfo[] = event.leaves.map((p: any) => ({
            userId: p.user_id,
            username: p.username,
            sessionId: p.session_id,
            status: "offline",
          }));
          for (const l of leaves) this.presences.delete(l.userId);
          this.handlers.onPresenceLeave?.(leaves);
        }
      };

      this.socket.onmatchdata = (matchData) => {
        try {
          const data = JSON.parse(new TextDecoder().decode(matchData.data as Uint8Array));
          this.handlers.onMatchState?.(matchData.op_code, data, matchData.presence?.user_id || "");
        } catch {
          // ignore parse errors
        }
      };

      this.socket.onchannelmessage = (msg) => {
        try {
          const content = msg.content ? JSON.parse(msg.content as string) : {};
          this.handlers.onChatMessage?.(
            msg.sender_id || "",
            msg.username || "",
            content.text || ""
          );
        } catch {}
      };

      await this.socket.connect(this.session, true);
      this._connected = true;
      this.handlers.onConnect?.();
      return true;
    } catch (err: any) {
      const msg = err?.message || "Failed to connect to Nakama";
      this.handlers.onError?.(msg);
      this._connected = false;
      return false;
    }
  }

  async joinOrCreateMatch(matchName: string = "dtecho-cognitive"): Promise<string | null> {
    if (!this.socket || !this.session) return null;

    try {
      // Try to find an existing match
      const result = await this.client.listMatches(this.session, 1, true, matchName);
      if (result.matches && result.matches.length > 0) {
        const match = await this.socket.joinMatch(result.matches[0].match_id);
        this.matchId = match.match_id;
      } else {
        const match = await this.socket.createMatch(matchName);
        this.matchId = match.match_id;
      }

      // Join a chat channel for text messages
      const channel = await this.socket.joinChat("dtecho-chat", 1, true, false);
      this.chatChannelId = channel.id;

      return this.matchId;
    } catch (err: any) {
      this.handlers.onError?.(err?.message || "Failed to join match");
      return null;
    }
  }

  sendMatchData(opCode: DTEOpCode, data: any) {
    if (!this.socket || !this.matchId) return;
    const encoded = new TextEncoder().encode(JSON.stringify(data));
    this.socket.sendMatchState(this.matchId, opCode, encoded);
  }

  async sendChatMessage(text: string) {
    if (!this.socket || !this.chatChannelId) return;
    try {
      await this.socket.writeChatMessage(this.chatChannelId, { text });
    } catch (err) {
      console.warn("Failed to send chat message:", err);
    }
  }

  async disconnect() {
    try {
      if (this.socket) {
        this.socket.disconnect(true);
      }
    } catch {}
    this.socket = null;
    this.session = null;
    this.matchId = null;
    this.chatChannelId = null;
    this.presences.clear();
    this._connected = false;
  }

  private getOrCreateDeviceId(): string {
    const key = "dtecho-device-id";
    let id = localStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(key, id);
    }
    return id;
  }
}
