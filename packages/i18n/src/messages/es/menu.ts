import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/menu";

export const messages = {
  "menu.stopAllAgents": "Detener todos los agentes",
  "menu.checkForUpdates": "Buscar actualizaciones…",
  "menu.preferences": "Ajustes…",
  "menu.actualSize": "Tamaño real",
  "menu.zoomIn": "Ampliar",
  "menu.zoomOut": "Reducir",
  "menu.copyLink": "Copiar enlace",
  "menu.trayOpen": "Abrir HoleBot",
  "menu.trayQuit": "Salir de HoleBot",
  "menu.trayTooltip": "HoleBot",
  "menu.undo": "Deshacer",
  "menu.redo": "Rehacer",
  "menu.cut": "Cortar",
  "menu.copy": "Copiar",
  "menu.paste": "Pegar",
  "menu.pasteAndMatchStyle": "Pegar y adaptar estilo",
  "menu.delete": "Eliminar",
  "menu.selectAll": "Seleccionar todo",
} as const satisfies PartialTranslation<typeof source>;
