/**
 * The fill of an agent's bubble: the agent's own color, washed out over the bubble base of the theme.
 * The base and the strength are theme tokens (`--openbot-bubble-agent-base`, `--openbot-bubble-agent-tint`),
 * so light mode gets a pale pastel and dark mode a deep, quiet shade of the same hue.
 *
 * Returns null when a color is not a `#rrggbb` value, so the caller keeps its neutral bubble.
 */
export function agentBubbleFill(agentColor: string, base: string, strength: number): string | null {
  const agent = rgb(agentColor);
  const under = rgb(base);
  if (!agent || !under || !Number.isFinite(strength)) return null;
  const amount = Math.min(1, Math.max(0, strength));
  const mixed = agent.map((channel, index) =>
    Math.round((under[index] ?? 0) + (channel - (under[index] ?? 0)) * amount),
  );
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function rgb(color: string): [number, number, number] | null {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/iu.exec(color.trim());
  if (!match) return null;
  return [
    Number.parseInt(match[1] ?? "", 16),
    Number.parseInt(match[2] ?? "", 16),
    Number.parseInt(match[3] ?? "", 16),
  ];
}
