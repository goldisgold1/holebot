import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/billing";

export const messages = {
  "error.billing.lifecycleFailed": "서버 요금제를 변경할 수 없어요. 결제를 새로고침한 후 다시 시도해 주세요.",
  "error.billing.confirmMismatch": "삭제하려면 서버 이름을 입력해 주세요.",
  "error.billing.restartBusy": "지금은 서버를 다시 시작할 수 없어요. 잠시 후 다시 시도해 주세요.",
  "error.billing.planRequired": "이 서버의 요금제가 종료되었어요. 서버를 시작하려면 요금제를 갱신해 주세요.",
  "error.billing.planSoldOut": "이 요금제는 품절되었어요. 다른 요금제를 선택해 주세요.",
  "error.billing.planCurrency": "새 요금제는 다른 요금제와 같은 통화를 사용해야 해요.",
  "error.billing.invalidRequest": "결제 요청이 올바르지 않아요.",
  "error.billing.invalidResponse": "결제 응답이 올바르지 않아요.",
  "error.billing.notStripePage": "결제 페이지가 Stripe 페이지가 아니에요.",
} as const satisfies PartialTranslation<typeof source>;
