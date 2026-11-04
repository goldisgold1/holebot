import type { AgentEvent, ClientAgentSummary } from "@openbot/contracts/ipc";
import {
  BOT_APP_SOUNDS,
  type BotAppSound,
  TASK_SOUND_CHOICES,
  type TaskSoundChoice,
} from "@openbot/ui/features/settings/app-settings";
import { play, unlock } from "cuelume";
import blipUrl from "./assets/sounds/blip.wav";
import chimeAUrl from "./assets/sounds/chime-a.wav";
import chimeBUrl from "./assets/sounds/chime-b.wav";
import doubleTickUrl from "./assets/sounds/double-tick.wav";
import tickUrl from "./assets/sounds/tick.wav";

const TASK_SOUND_STORAGE_KEY = "openbot:task-sound";
/** The on/off switch from before the sound choice. It is still written, so an older version keeps the choice. */
const COMPLETION_SOUND_STORAGE_KEY = "openbot:completion-sound-enabled";
const COMPLETION_SOUND_DURATION_SECONDS = 0.22;

let completionAudioContext: AudioContext | undefined;

const BOT_APP_SOUND_URLS: Readonly<Record<BotAppSound, string>> = {
  blip: blipUrl,
  tick: tickUrl,
  "double-tick": doubleTickUrl,
  "chime-a": chimeAUrl,
  "chime-b": chimeBUrl,
};
/** HoleA.I (from Vincent's bot app): the bot app plays its sounds at full volume. */
const BOT_APP_SOUND_GAIN = 1;
/** HoleA.I (from Vincent's bot app): an agent's sound plays at most once in this long. */
export const TASK_SOUND_THROTTLE_MS = 5_000;
const decodedSounds = new Map<BotAppSound, Promise<AudioBuffer>>();

type NotificationAgent = Pick<ClientAgentSummary, "id" | "notifications">;
type PreferenceStorage = Pick<Storage, "getItem">;

/** The choice for this page after the browser did not save it. It wins over an older saved value. */
let unsavedPreference: TaskSoundChoice | undefined;

/**
 * The bot app's blip plays unless the user chose another sound. A switch turned off before the choice,
 * or in an older version, is "off". Reading `window.localStorage` throws when the browser blocks
 * storage, so it is read inside the guard.
 */
export function readTaskSound(storage?: PreferenceStorage): TaskSoundChoice {
  if (unsavedPreference !== undefined) return unsavedPreference;
  try {
    const source = storage ?? window.localStorage;
    if (source.getItem(COMPLETION_SOUND_STORAGE_KEY) === "false") return "off";
    const saved = source.getItem(TASK_SOUND_STORAGE_KEY);
    // A saved "off" with the switch on means that an older version turned the sound on again.
    return TASK_SOUND_CHOICES.find((choice) => choice === saved && choice !== "off") ?? "blip";
  } catch {
    return "blip";
  }
}

const taskSoundListeners = new Set<(choice: TaskSoundChoice) => void>();

/** Calls `listener` with each new task sound choice of this page. Returns the unsubscribe. */
export function onTaskSoundChange(listener: (choice: TaskSoundChoice) => void): () => void {
  taskSoundListeners.add(listener);
  return () => taskSoundListeners.delete(listener);
}

export function setTaskSound(choice: TaskSoundChoice, storage?: Pick<Storage, "setItem">): void {
  for (const listener of taskSoundListeners) listener(choice);
  try {
    const target = storage ?? window.localStorage;
    // The switch goes first: when only it is saved, "off" still reads as off.
    target.setItem(COMPLETION_SOUND_STORAGE_KEY, String(choice !== "off"));
    target.setItem(TASK_SOUND_STORAGE_KEY, choice);
    unsavedPreference = undefined;
  } catch {
    // Blocked or full storage keeps the choice for this page only.
    unsavedPreference = choice;
  }
}

/**
 * HoleA.I (from Vincent's bot app): the agent and the request of an event that plays the task sound: a
 * finished reply, and a wait for the user (a question, an approval, a browser step), as the bot app sounds
 * for each notification it delivers. Null for any other event.
 */
export function taskSoundRequest(event: AgentEvent): { agentId: string; request: string; waits: boolean } | null {
  switch (event.type) {
    case "turn-completed":
      // A quiet routine run posted nothing, so it has no reply to announce. A turn that continues its
      // plan is not the end of the request.
      if (event.status !== "completed" || event.quiet || event.continues) return null;
      return { agentId: event.agentId, request: `turn:${event.turnId}`, waits: false };
    case "prompt":
      return { agentId: event.agentId, request: `prompt:${event.turnId}:${event.requestId}`, waits: true };
    case "approval":
      return {
        agentId: event.approval.agentId,
        request: `approval:${event.approval.turnId}:${event.approval.requestId}`,
        waits: true,
      };
    case "browser-takeover-requested":
      return {
        agentId: event.request.agentId,
        request: `browser:${event.request.turnId}:${event.request.requestId}`,
        waits: true,
      };
    default:
      return null;
  }
}

export interface TaskSoundGate {
  /** Whether the user has this agent's chat in front of them, which then makes no sound. */
  chatOnScreen?: ((agentId: string) => boolean) | undefined;
  /** Whether a wait for the user may sound; a finished reply only checks the agent's switch. */
  waitsSound?: boolean | undefined;
  now?: (() => number) | undefined;
}

const lastSoundAt = new Map<string, number>();
const lastSoundRequest = new Map<string, string>();

/** Whether the event plays the task sound now. Records the play, so a repeat or a quick second one is silent. */
export function shouldPlayTaskSound(event: AgentEvent, agents: NotificationAgent[], gate: TaskSoundGate = {}): boolean {
  const sound = taskSoundRequest(event);
  if (!sound) return false;
  if (sound.waits && gate.waitsSound === false) return false;
  if (!agents.some((agent) => agent.id === sound.agentId && agent.notifications)) return false;
  // A host can send the same request again, as after a reconnect.
  if (lastSoundRequest.get(sound.agentId) === sound.request) return false;
  lastSoundRequest.set(sound.agentId, sound.request);
  if (gate.chatOnScreen?.(sound.agentId)) return false;
  const now = gate.now?.() ?? Date.now();
  const last = lastSoundAt.get(sound.agentId);
  if (last !== undefined && now - last < TASK_SOUND_THROTTLE_MS) return false;
  lastSoundAt.set(sound.agentId, now);
  return true;
}

/** Plays the task sound for a finished reply or a wait for the user. Returns whether it played. */
export function playCompletionSoundForAgentEvent(
  event: AgentEvent,
  agents: NotificationAgent[],
  storage?: PreferenceStorage,
  gate?: TaskSoundGate,
): boolean {
  const choice = readTaskSound(storage);
  if (choice === "off" || !shouldPlayTaskSound(event, agents, gate)) return false;
  playSoundChoice(choice);
  return true;
}

/**
 * Plays a task sound, or previews a sound from a sound menu. A theme plays its success cue while
 * the action sounds are off, because the task sound is a separate choice.
 */
export function playSoundChoice(choice: TaskSoundChoice): void {
  if (choice === "classic") void playClassicTone();
  else if (isBotAppSound(choice)) void playBotAppSound(choice);
  else if (choice !== "off") play("success", { theme: choice, force: true });
}

/**
 * Starts the audio contexts from a user action. Safari starts a context only from one, a turn can end
 * long after the last action, and iOS can interrupt a running context. The app context also plays
 * the voice limit cues, so it starts for each choice.
 */
export function unlockCompletionSound(): void {
  // A theme plays on the cuelume context.
  const choice = readTaskSound();
  if (choice !== "off" && choice !== "classic" && !isBotAppSound(choice)) void unlock();
  try {
    completionAudioContext ??= new AudioContext();
    if (completionAudioContext.state !== "running") void completionAudioContext.resume().catch(() => undefined);
  } catch {
    completionAudioContext = undefined;
  }
}

/** The one audio context of the app sounds, so that each sound does not keep its own output open. */
export async function appSoundContext(): Promise<AudioContext> {
  try {
    completionAudioContext ??= new AudioContext();
    if (completionAudioContext.state === "suspended") await completionAudioContext.resume();
    return completionAudioContext;
  } catch (error) {
    completionAudioContext = undefined;
    throw error;
  }
}

async function playClassicTone(): Promise<void> {
  try {
    const context = await appSoundContext();

    const startedAt = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(420, startedAt);
    oscillator.frequency.exponentialRampToValueAtTime(160, startedAt + 0.18);
    gain.gain.setValueAtTime(0.0001, startedAt);
    gain.gain.exponentialRampToValueAtTime(0.16, startedAt + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, startedAt + COMPLETION_SOUND_DURATION_SECONDS);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.addEventListener(
      "ended",
      () => {
        oscillator.disconnect();
        gain.disconnect();
      },
      { once: true },
    );
    oscillator.start(startedAt);
    oscillator.stop(startedAt + COMPLETION_SOUND_DURATION_SECONDS);
  } catch {
    completionAudioContext = undefined;
  }
}

function isBotAppSound(choice: TaskSoundChoice): choice is BotAppSound {
  return BOT_APP_SOUNDS.some((sound) => sound === choice);
}

async function playBotAppSound(sound: BotAppSound): Promise<void> {
  try {
    const context = await appSoundContext();
    let decoded = decodedSounds.get(sound);
    if (!decoded) {
      decoded = fetch(BOT_APP_SOUND_URLS[sound])
        .then((response) => response.arrayBuffer())
        .then((data) => context.decodeAudioData(data));
      decodedSounds.set(sound, decoded);
      decoded.catch(() => decodedSounds.delete(sound));
    }
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = await decoded;
    gain.gain.value = BOT_APP_SOUND_GAIN;
    source.connect(gain);
    gain.connect(context.destination);
    source.addEventListener(
      "ended",
      () => {
        source.disconnect();
        gain.disconnect();
      },
      { once: true },
    );
    source.start();
  } catch {
    completionAudioContext = undefined;
  }
}
