// The desktop notification switches and the event main sends when the user clicks a notification.

export interface NotificationPreference {
  desktopNotifications: boolean;
  /** Show the start of the agent's reply, question or command instead of a fixed text. */
  messagePreview: boolean;
}

/**
 * HoleA.I (from Vincent's bot app): what one app window has on screen, so main shows no notification for
 * the chat the user is looking at, and keeps the toast silent when the window plays its own sound.
 */
export interface NotificationPresence {
  serverId: string | null;
  /** The agent chat on screen, or null. */
  agentId: string | null;
  /** The group chat on screen, or null. */
  channelId: string | null;
  /** The window plays the task sound for the server's finished replies and waits. */
  appSound: boolean;
}

// The conversation a clicked notification was about. The renderer opens it.
export interface NotificationOpenedEvent {
  serverId: string;
  agentId: string;
  threadId: string | null;
  /** The channel of a channel notification. The renderer opens the channel, not the agent chat. */
  channelId?: string;
}
