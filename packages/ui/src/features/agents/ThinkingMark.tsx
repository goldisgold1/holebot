/**
 * HoleA.I: the little ball beside "Thinking" while an agent works. It plays one loop: a face with pill eyes,
 * a squeeze into three loading dots, a face with round eyes, a roll that carries the eyes round the ball,
 * and back. The drawing is ours; the loop is CSS in holeai-clean.css, and reduced motion holds the face.
 */
export function ThinkingMark(props: { class?: string; still?: boolean }) {
  return (
    <svg
      class={`thinking-mark ${props.class ?? ""}`}
      viewBox="-32 -32 64 64"
      data-still={props.still ? "" : undefined}
      aria-hidden="true"
    >
      <g class="thinking-mark-side">
        <circle cx="-22" cy="0" r="5" />
        <circle cx="22" cy="0" r="5" />
      </g>
      <g class="thinking-mark-ball">
        <circle class="thinking-mark-body" cx="0" cy="0" r="24" />
        <g class="thinking-mark-eyes">
          <ellipse cx="-8" cy="-1" rx="4.2" ry="8.5" />
          <ellipse cx="8" cy="-1" rx="4.2" ry="8.5" />
        </g>
      </g>
    </svg>
  );
}
