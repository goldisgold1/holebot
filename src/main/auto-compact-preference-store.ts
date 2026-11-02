import {
  type AutoCompactPreference,
  DEFAULT_AUTO_COMPACT_THRESHOLD,
  isAutoCompactThreshold,
} from "@openbot/contracts/ipc";
import { isDynamicRecord } from "@openbot/contracts/runtime-values";
import { Effect, Result, Semaphore } from "effect";
import { isMissingFileError } from "../backend/file-errors";
import { type PreferenceFileFailure, readPreferenceFile, writePreferenceFile } from "./preference-file";

/**
 * The share of the context window at which a chat compacts on its own, or null for Off. The backend
 * reads it at each usage report, so it is held in memory after `load` rather than read from disk.
 *
 * A file that is missing, unreadable as JSON or names a value out of range reads as 80%, the only
 * threshold before the setting existed. Writes are chained for the reason
 * `update-preference-store.ts` chains its own.
 */
export class AutoCompactPreferenceStore {
  readonly #path: string;
  #preference: AutoCompactPreference = { threshold: DEFAULT_AUTO_COMPACT_THRESHOLD };
  #writes = Semaphore.makeUnsafe(1);
  readonly #listeners = new Set<(preference: AutoCompactPreference) => void>();

  constructor(path: string) {
    this.#path = path;
  }

  load(): Effect.Effect<void, PreferenceFileFailure> {
    return Effect.gen({ self: this }, function* () {
      const loaded = yield* Effect.result(
        readPreferenceFile(this.#path, (parsed): AutoCompactPreference | null =>
          isDynamicRecord(parsed) && parsed.version === 1 && isAutoCompactThreshold(parsed.threshold)
            ? { threshold: parsed.threshold }
            : null,
        ),
      );
      if (Result.isSuccess(loaded)) {
        if (loaded.success) this.#preference = loaded.success;
      } else if (!isMissingFileError(loaded.failure.cause) && !(loaded.failure.cause instanceof SyntaxError))
        return yield* loaded.failure;
    });
  }

  get(): AutoCompactPreference {
    return { ...this.#preference };
  }

  readonly set = Effect.fn("AutoCompactPreference.set")(function* (
    this: AutoCompactPreferenceStore,
    { threshold }: AutoCompactPreference,
  ) {
    yield* this.#writes.withPermit(
      Effect.uninterruptible(
        writePreferenceFile(this.#path, { version: 1, threshold }).pipe(
          Effect.tap(() =>
            Effect.sync(() => {
              this.#preference = { threshold };
            }),
          ),
        ),
      ),
    );
    const saved = this.get();
    for (const listener of this.#listeners) listener(saved);
    return saved;
  });

  /** Calls `listener` with each saved preference, so the backend applies it to running chats. */
  subscribe(listener: (preference: AutoCompactPreference) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }
}
