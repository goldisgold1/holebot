import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/status/host";

export const messages = {
  "status.host.registered": "Deze HoleBot is geregistreerd voor WebRTC-toegang.",
  "status.host.keyRotated": "Serversleutel gewijzigd. Gekoppelde apparaten blijven gekoppeld.",
  "status.host.identityUpdated": "Serveridentiteit bijgewerkt.",
  "status.host.starting": "WebRTC-host starten…",
  "status.host.ready": "Deze HoleBot is klaar voor WebRTC-verbindingen.",
  "status.host.stopping": "Deze HoleBot privé maken…",
  "status.host.private": "Deze HoleBot is privé.",
} as const satisfies PartialTranslation<typeof source>;
