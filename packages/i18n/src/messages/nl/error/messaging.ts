import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/messaging";

export const messages = {
  "error.messaging.notConnected": "Deze Slack-werkruimte is niet verbonden.",
  "error.messaging.unsupported": "Deze computer kan geen verbinding maken met Slack.",
  "error.messaging.relayUnavailable":
    "HoleBot kan op deze computer geen Slack-events ontvangen. Log in, geef deze computer een naam en probeer het opnieuw.",
  "error.messaging.discordNotConnected": "Deze Discord-server is niet verbonden.",
  "error.messaging.discordUnsupported": "Deze computer kan geen verbinding maken met Discord.",
  "error.messaging.discordRelayUnavailable":
    "HoleBot kan op deze computer geen Discord-events ontvangen. Log in, geef deze computer een naam en probeer het opnieuw.",
  "error.messaging.discordRolesUnsupported": "HoleBot kan nog geen Discord-rollen tonen. Probeer het later opnieuw.",
  "error.messaging.telegramNotConnected": "Deze Telegram-chat is niet verbonden.",
  "error.messaging.telegramUnsupported": "Deze computer kan geen verbinding maken met Telegram.",
  "error.messaging.telegramRelayUnavailable":
    "HoleBot kan Telegram niet bereiken op deze computer. Log in, geef deze computer een naam en probeer het opnieuw.",
  "error.messaging.telegramServiceUnavailable": "HoleBot kan Telegram nu niet verbinden. Probeer het later opnieuw.",
  "error.messaging.memoryLimit":
    "Een verbonden werkruimte kan maximaal {limit} herinneringen hebben. Verwijder er eerst een.",
} as const satisfies PartialTranslation<typeof source>;
