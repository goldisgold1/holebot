import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/billing";

export const messages = {
  "error.billing.lifecycleFailed":
    "Het abonnement van de server kon niet worden gewijzigd. Vernieuw Facturering en probeer het opnieuw.",
  "error.billing.confirmMismatch": "Typ de naam van de server om hem te verwijderen.",
  "error.billing.restartBusy": "De server kan nu niet herstarten. Probeer het over een minuut opnieuw.",
  "error.billing.planRequired": "Het abonnement van deze server is afgelopen. Verleng het om de server te starten.",
  "error.billing.planSoldOut": "Dit abonnement is uitverkocht. Kies een ander abonnement.",
  "error.billing.invalidRequest": "Het factureringsverzoek is ongeldig.",
  "error.billing.invalidResponse": "Het factureringsantwoord is ongeldig.",
  "error.billing.notStripePage": "De factureringspagina is geen Stripe-pagina.",
} as const satisfies PartialTranslation<typeof source>;
