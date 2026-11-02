import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/status/messaging";

export const messages = {
  // Text that HoleBot posts in a Slack conversation. Slack users read it. It names no agent: in
  // Slack, every answer comes from HoleBot.
  "status.messaging.working": "Üzerinde çalışılıyor…",
  "status.messaging.queued": "Bekleniyor: HoleBot başka bir istek üzerinde çalışıyor. Yanıt buraya gelecek.",
  "status.messaging.busy": "Çok fazla istek bekliyor. Daha sonra tekrar deneyin.",
  "status.messaging.failed": "HoleBot bu isteği tamamlayamadı. Ayrıntılar HoleBot ana makinesinde mevcuttur.",
  "status.messaging.noAnswer": "HoleBot yazılı bir yanıt olmadan tamamlandı.",
  "status.messaging.noAgent": "Henüz burada yanıt verebilecek bir ajan yok. HoleBot'ta Slack Düzenleyicisini ekleyin.",
  "status.messaging.delegated": "Bir ekip arkadaşı üzerinde çalışıyor. Yanıt buraya gelecek.",
  "status.messaging.stopped": "Durduruldu.",
  "status.messaging.stop": "Durdur",
  "status.messaging.approvalTitle": "HoleBot devam etmek için onay istiyor.",
  "status.messaging.approvalCommand": "Bir komut çalıştır",
  "status.messaging.approvalFileChange": "Dosyaları değiştir",
  "status.messaging.approvalPermissions": "Daha fazla izin al",
  "status.messaging.approve": "Onayla",
  "status.messaging.deny": "Reddet",
  "status.messaging.approvedBy": "{user} tarafından onaylandı.",
  "status.messaging.deniedBy": "{user} tarafından reddedildi.",
  "status.messaging.answeredOnHost": "HoleBot ana makinesinde yanıtlandı.",
  "status.messaging.requestInactive": "Bu istek artık etkin değil.",
  "status.messaging.onlyRequester": "Bunu yalnızca {user} yapabilir. HoleBot ana makinesi de yanıt verebilir.",
  "status.messaging.hostOnly": "Bu isteği yalnızca HoleBot ana makinesi yanıtlayabilir.",
  "status.messaging.filesSkipped": "Bazı dosyalar gönderilmedi: {names}.",
  // The name and title of the agent that HoleBot adds to answer in Slack. The user can rename it.
  "status.messaging.orchestratorName": "Slack Düzenleyicisi",
  "status.messaging.orchestratorTitle": "Slack'te yanıt verir ve ekibe sorar",
  // The same texts for Discord. Discord users read the first one.
  "status.messaging.discordNoAgent":
    "Henüz burada yanıt verebilecek bir ajan yok. HoleBot'ta Discord Düzenleyicisini ekleyin.",
  "status.messaging.discordOrchestratorName": "Discord Düzenleyicisi",
  "status.messaging.discordOrchestratorTitle": "Discord'da yanıt verir ve ekibe sorar",
  // The sidebar section that HoleBot puts the Slack Orchestrator in. The user can rename it.
  "status.messaging.integrationsSection": "Entegrasyonlar",
  // The page a development Slack install ends on.
  "status.messaging.signInReceived": "HoleBot Slack kurulumunu aldı. Bu sekmeyi kapatabilirsiniz.",
  "status.messaging.signInUnknown": "HoleBot bu Slack kurulumunu başlatmadı. HoleBot içinde tekrar başlatın.",
  "status.messaging.telegramNoAgent":
    "Henüz burada yanıt verebilecek bir ajan yok. HoleBot'ta Telegram Düzenleyicisini ekleyin.",
  "status.messaging.telegramLinked":
    "HoleBot bu sohbete bağlandı. Ajanlara sormak için {bot} adını anın veya HoleBot'un bir mesajını yanıtlayın.",
  "status.messaging.telegramOrchestratorName": "Telegram Düzenleyicisi",
  "status.messaging.telegramOrchestratorTitle": "Telegram'da yanıt verir ve ekibe sorar",
} as const satisfies PartialTranslation<typeof source>;
