import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/messaging";

export const messages = {
  "messaging.help.invalid_token":
    "Slack больше не принимает HoleBot в этом рабочем пространстве. Возможно, приложение удалили. Подключите рабочее пространство заново.",
  "messaging.help.secret_storage_unavailable":
    "HoleBot не может прочитать сохранённые токены на этом компьютере. Отключите рабочее пространство и подключите его снова.",
  "messaging.help.relay_unavailable":
    "HoleBot не может получать события Slack на этом компьютере. Войдите в аккаунт, задайте компьютеру имя в настройках сервера и не закрывайте HoleBot.",
  "messaging.discordHelp.invalid_token":
    "Discord больше не принимает HoleBot на этом сервере Discord. Возможно, приложение удалили. Подключите сервер Discord заново.",
  "messaging.discordHelp.secret_storage_unavailable":
    "HoleBot не может прочитать сохранённые токены на этом компьютере. Отключите сервер Discord и подключите его снова.",
  "messaging.discordHelp.relay_unavailable":
    "HoleBot не может получать события Discord на этом компьютере. Войдите в аккаунт, задайте компьютеру имя в настройках сервера и не закрывайте HoleBot.",
} as const satisfies PartialTranslation<typeof source>;
