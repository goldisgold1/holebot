import { AUTO_COMPACT_PRESETS, type AutoCompactThreshold } from "@openbot/contracts/ipc";
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@openbot/ui";
import type { JSX } from "@solidjs/web";
import { createSignal, Show } from "solid-js";
import { useText } from "../../text";

type AutoCompactChoice = "off" | "custom" | number;

/** A whole percent of the window, 1-100, as the custom field shows it. */
function wholePercent(threshold: number): number {
  return Math.min(100, Math.max(1, Math.round(threshold * 100)));
}

export interface AutoCompactSelectProps {
  /** The share of the window (0.01-1), or null for Off. */
  value: AutoCompactThreshold;
  onChange: (value: AutoCompactThreshold) => void;
  disabled?: boolean;
  /** The element the popover portals into, as the other Settings selects receive it. */
  mount?: HTMLElement | undefined;
}

/**
 * When a chat compacts on its own: Off, a preset share of the context window, or any whole percent.
 * Settings and the composer's context ring show the same control.
 */
export function AutoCompactSelect(props: AutoCompactSelectProps): JSX.Element {
  const { t, format } = useText();
  // The user picked Custom… and has not typed a value yet, or the value is not a preset.
  const [customOpen, setCustomOpen] = createSignal(false);
  const isPreset = (value: AutoCompactThreshold) =>
    value !== null && AUTO_COMPACT_PRESETS.some((preset) => Math.abs(preset - value) < 0.0001);
  const selected = (): AutoCompactChoice => {
    if (customOpen()) return "custom";
    if (props.value === null) return "off";
    return isPreset(props.value) ? props.value : "custom";
  };
  const options = (): AutoCompactChoice[] => ["off", ...AUTO_COMPACT_PRESETS, "custom"];
  const label = (choice: AutoCompactChoice) => {
    if (choice === "off") return t("settings.autoCompact.off");
    if (choice === "custom")
      return props.value !== null && !isPreset(props.value)
        ? format.percent(props.value, { maximumFractionDigits: 0 })
        : t("settings.autoCompact.custom");
    return format.percent(choice, { maximumFractionDigits: 0 });
  };
  const commitCustom = (text: string) => {
    const percent = Number.parseInt(text, 10);
    if (!Number.isFinite(percent)) return;
    setCustomOpen(false);
    props.onChange(Math.min(100, Math.max(1, percent)) / 100);
  };

  return (
    <span class="auto-compact-select">
      <Select<AutoCompactChoice>
        class="settings-modal-select"
        options={options()}
        optionValue={(choice) => String(choice)}
        optionTextValue={(choice) => label(choice)}
        value={selected()}
        disabled={props.disabled ?? false}
        onChange={(choice) => {
          if (choice === null) return;
          if (choice === "custom") {
            setCustomOpen(true);
            return;
          }
          setCustomOpen(false);
          props.onChange(choice === "off" ? null : choice);
        }}
        placement="bottom-end"
        itemComponent={(itemProps) => <SelectItem item={itemProps.item}>{label(itemProps.item.rawValue)}</SelectItem>}
      >
        <SelectTrigger size="sm" aria-label={t("settings.autoCompact.title")}>
          <SelectValue<AutoCompactChoice>>{(state) => label(state.selectedOption())}</SelectValue>
        </SelectTrigger>
        <SelectContent mount={props.mount} />
      </Select>
      <Show when={selected() === "custom"}>
        <Input
          class="auto-compact-percent"
          size="sm"
          type="number"
          inputmode="numeric"
          min="1"
          max="100"
          step="1"
          aria-label={t("settings.autoCompact.customLabel")}
          disabled={props.disabled ?? false}
          defaultValue={String(props.value === null ? 80 : wholePercent(props.value))}
          onChange={(event) => commitCustom(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") commitCustom(event.currentTarget.value);
          }}
        />
      </Show>
    </span>
  );
}
