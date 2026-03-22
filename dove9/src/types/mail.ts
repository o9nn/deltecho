/**
 * Mail message structure compatible with Dove9 MessageProcess
 */
export interface MailMessage {
  messageId: string;
  threadId?: string;
  inReplyTo?: string;
  references?: string[];
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  subject: string;
  body: string;
  bodyHtml?: string;
  headers: Map<string, string>;
  timestamp: Date;
  receivedAt: Date;
  flags?: MailFlag[];
  mailbox: string;
  size?: number;
  attachments?: MailAttachment[];
}

export interface MailAttachment {
  filename: string;
  contentType: string;
  size: number;
  content?: Buffer;
  contentId?: string;
}

export enum MailFlag {
  SEEN = '\\Seen',
  ANSWERED = '\\Answered',
  FLAGGED = '\\Flagged',
  DELETED = '\\Deleted',
  DRAFT = '\\Draft',
}

export interface MailboxMapping {
  inbox: string; // INBOX - Pending processes
  processing: string; // INBOX.Processing - Active processes
  sent: string; // Sent - Completed processes
  drafts: string; // Drafts - Suspended processes
  trash: string; // Trash - Terminated processes
  archive: string; // Archive - Historical processes
}

export const DEFAULT_MAILBOX_MAPPING: MailboxMapping = {
  inbox: 'INBOX',
  processing: 'INBOX.Processing',
  sent: 'Sent',
  drafts: 'Drafts',
  trash: 'Trash',
  archive: 'Archive',
};

/**
 * Mail protocol types (IMAP, SMTP, LMTP)
 */
export enum MailProtocol {
  IMAP = 'IMAP',
  SMTP = 'SMTP',
  LMTP = 'LMTP',
}

/**
 * Mail operation types for IPC
 */
export enum MailOperation {
  FETCH = 'FETCH',
  SEND = 'SEND',
  MOVE = 'MOVE',
  DELETE = 'DELETE',
  MARK = 'MARK',
}

/**
 * Mail-based IPC request
 */
export interface MailIPCRequest {
  protocol: MailProtocol;
  operation: MailOperation;
  mailbox?: string;
  message?: MailMessage;
  flags?: MailFlag[];
  destination?: string;
}

/**
 * Mail-based IPC response
 */
export interface MailIPCResponse {
  success: boolean;
  message?: MailMessage;
  messages?: MailMessage[];
  error?: string;
}
