import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/billing";

export const messages = {
  "error.billing.lifecycleFailed": "Sunucu planı değiştirilemedi. Faturalandırma'yı yenileyin ve tekrar deneyin.",
  "error.billing.confirmMismatch": "Silmek için sunucu adını yazın.",
  "error.billing.restartBusy": "Sunucu şu anda yeniden başlatılamıyor. Bir dakika sonra tekrar deneyin.",
  "error.billing.planRequired": "Bu sunucunun planı sona erdi. Sunucuyu başlatmak için planı yenileyin.",
  "error.billing.planSoldOut": "Bu plan tükendi. Başka bir plan seçin.",
  "error.billing.planCurrency": "Yeni bir plan, diğer planlarınızın para birimini kullanmalıdır.",
  "error.billing.invalidRequest": "Faturalandırma isteği geçersiz.",
  "error.billing.invalidResponse": "Faturalandırma yanıtı geçersiz.",
  "error.billing.notStripePage": "Faturalandırma sayfası bir Stripe sayfası değil.",
} as const satisfies PartialTranslation<typeof source>;
