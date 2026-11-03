/**
 * HoleA.I: the outfit an agent's avatar wears for its role, drawn over the avatar.
 *
 * The outfit always shows, so a role reads at a glance; while the agent works, its prop moves (the
 * Reel Worker snaps its clapper, the Producer shouts into the megaphone, COS ticks the clipboard, ...)
 * and the avatar bobs. Everything stays inside the avatar's own box, so a row never grows or covers
 * the next one. It is decoration, hidden from screen readers.
 */

import type { JSX } from "@solidjs/web";
import { Show } from "solid-js";
import type { AgentWorkRole } from "./AgentWorkScene";

/** Each role's outfit, on a 48 x 48 box laid over the avatar: hats on top, the prop at the lower right. */
const OUTFITS: Partial<Record<AgentWorkRole, () => JSX.Element>> = {
  // Headphones on, a clapper in hand.
  reel: () => (
    <>
      <path class="ao-band" d="M9 22C9 5 39 5 39 22" />
      <rect class="ao-pink ao-beat" x="4" y="17" width="7" height="12" rx="3" />
      <rect class="ao-pink ao-beat" x="37" y="17" width="7" height="12" rx="3" />
      <rect class="ao-ink" x="31" y="37" width="15" height="10" rx="1.5" />
      <rect class="ao-orange ao-clap" x="31" y="32" width="15" height="4" rx="1" />
    </>
  ),
  // A Hollywood director: beret, dark glasses and a megaphone.
  producer: () => (
    <>
      <ellipse class="ao-red" cx="21" cy="7" rx="14" ry="4.5" transform="rotate(-10 21 7)" />
      <circle class="ao-red" cx="20" cy="2.5" r="1.8" />
      <rect class="ao-ink" x="12" y="17" width="10" height="6" rx="2.5" />
      <rect class="ao-ink" x="26" y="17" width="10" height="6" rx="2.5" />
      <path class="ao-band ao-thin" d="M22 19.5h4" />
      <g class="ao-shout">
        <rect class="ao-ink" x="31" y="37" width="4" height="5" rx="1" />
        <path class="ao-orange" d="M34 36.5l10-5v15l-10-5z" />
      </g>
      <path class="ao-wave" d="M46.5 35a6 6 0 0 1 0 8" />
      <path class="ao-wave ao-late" d="M49 32.5a10 10 0 0 1 0 13" />
    </>
  ),
  // Chief of Staff: a headset and the clipboard of what everyone does.
  cos: () => (
    <>
      <path class="ao-band ao-accent" d="M10 21C10 6 38 6 38 21" />
      <circle class="ao-accent-fill" cx="9" cy="22" r="3.5" />
      <path class="ao-band ao-accent ao-thin" d="M9 25q1 8 9 9" />
      <circle class="ao-accent-fill" cx="19" cy="34" r="1.8" />
      <g class="ao-tilt">
        <rect class="ao-paper" x="32" y="30" width="14" height="17" rx="2" />
        <rect class="ao-ink" x="35.5" y="28.5" width="7" height="3" rx="1" />
        <path class="ao-tick" d="M34.5 37.5l2 2 3.5-4" />
        <rect class="ao-line" x="41" y="36" width="3" height="1.6" rx="0.8" />
        <rect class="ao-line" x="35" y="42" width="9" height="1.6" rx="0.8" />
      </g>
    </>
  ),
  // Rosie: a bow, reading glasses and her laptop; the report flies off to Elle.
  coo: () => (
    <>
      <path class="ao-pink" d="M33 6l-5-4v8zM33 6l5-4v8z" />
      <circle class="ao-pink" cx="33" cy="6" r="1.8" />
      <circle class="ao-band ao-thin" cx="18.5" cy="20" r="4.5" />
      <circle class="ao-band ao-thin" cx="29.5" cy="20" r="4.5" />
      <path class="ao-band ao-thin" d="M23 20h2" />
      <rect class="ao-paper" x="31" y="34" width="14" height="9" rx="1.5" />
      <rect class="ao-pink ao-type" x="33" y="36.5" width="10" height="1.6" rx="0.8" />
      <rect class="ao-line ao-type ao-late" x="33" y="39.5" width="7" height="1.6" rx="0.8" />
      <rect class="ao-ink" x="29" y="43" width="18" height="2.5" rx="1.2" />
      <path class="ao-pink ao-fly" d="M38 31l8-4-3 8-2-3z" />
    </>
  ),
  // The Analyst: a detective's cap and a magnifying glass over the footage; the read gets its score.
  analyst: () => (
    <>
      <path class="ao-orange" d="M10 12Q24-1 38 12z" />
      <rect class="ao-ink" x="8" y="11" width="32" height="2.5" rx="1.2" />
      <g class="ao-scan">
        <circle class="ao-band" cx="35" cy="36" r="5" />
        <path class="ao-band" d="M38.5 39.5l5 5" />
      </g>
      <circle class="ao-green ao-pop" cx="43" cy="27" r="4" />
      <path class="ao-check" d="M41.2 27l1.3 1.3 2.4-2.6" />
    </>
  ),
  // The Strategist: a general's cap and a board of clusters; the winner gets the star.
  strategist: () => (
    <>
      <path class="ao-green" d="M11 11Q24 0 37 11v2H11z" />
      <rect class="ao-ink" x="9" y="12" width="30" height="2.5" rx="1.2" />
      <path class="ao-yellow" d="M24 3.5l1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2-1.6-1.5 2.2-.3z" />
      <rect class="ao-paper" x="30" y="32" width="16" height="13" rx="2" />
      <circle class="ao-pink ao-hop" cx="34" cy="40" r="1.8" />
      <circle class="ao-blue ao-hop ao-late" cx="38.5" cy="36" r="1.8" />
      <path class="ao-yellow ao-pop" d="M42.5 36l1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2-1.6-1.5 2.2-.3z" />
    </>
  ),
  // The Story Maker: a beanie and a phone; it snaps the inspiration and stamps a label on it.
  story: () => (
    <>
      <path class="ao-pink" d="M11 12Q24 0 37 12z" />
      <rect class="ao-ink" x="10" y="11" width="28" height="3" rx="1.5" />
      <circle class="ao-pink" cx="24" cy="3" r="2.5" />
      <rect class="ao-ink" x="33" y="29" width="11" height="18" rx="2.5" />
      <rect class="ao-paper" x="34.5" y="31.5" width="8" height="12" rx="1" />
      <circle class="ao-flash" cx="38.5" cy="37.5" r="6" />
      <rect class="ao-orange ao-pop" x="35" y="40" width="7" height="3" rx="1" />
    </>
  ),
  // The Carousel Maker: a painter's beret and a deck of slides it deals.
  carousel: () => (
    <>
      <ellipse class="ao-blue" cx="25" cy="7" rx="13" ry="4.5" transform="rotate(8 25 7)" />
      <circle class="ao-blue" cx="27" cy="2.6" r="1.6" />
      <rect class="ao-orange" x="30" y="34" width="12" height="12" rx="1.5" />
      <rect class="ao-pink" x="32" y="32" width="12" height="12" rx="1.5" />
      <rect class="ao-paper ao-deal" x="34" y="30" width="12" height="12" rx="1.5" />
    </>
  ),
  // The Image Producer: a bucket hat and a camera that prints a photo.
  image: () => (
    <>
      <path class="ao-yellow" d="M13 11Q24 1 35 11z" />
      <ellipse class="ao-yellow" cx="24" cy="11.5" rx="16" ry="2.5" />
      <rect class="ao-paper ao-print" x="33.5" y="38" width="10" height="9" rx="1" />
      <rect class="ao-ink" x="30" y="31" width="17" height="10" rx="2" />
      <circle class="ao-paper" cx="38.5" cy="36" r="3" />
      <rect class="ao-ink" x="32" y="29" width="5" height="3" rx="1" />
      <circle class="ao-flash" cx="44" cy="31" r="4" />
    </>
  ),
  // The Publisher: a mail carrier's cap and the paper plane it sends.
  publisher: () => (
    <>
      <path class="ao-blue" d="M11 11Q24 0 37 11v2H11z" />
      <path class="ao-ink" d="M24 12.5h15q-2 3-7 3h-8z" />
      <path class="ao-paper ao-fly" d="M31 41l15-8-5 13-3-4z" />
      <path class="ao-line" d="M38 42l8-9-5 6z" />
    </>
  ),
  // The Coder: square glasses and a keyboard it types on.
  coder: () => (
    <>
      <rect class="ao-band ao-thin" x="13.5" y="16.5" width="9" height="7" rx="1.5" />
      <rect class="ao-band ao-thin" x="25.5" y="16.5" width="9" height="7" rx="1.5" />
      <path class="ao-band ao-thin" d="M22.5 20h3" />
      <rect class="ao-ink" x="28" y="38" width="19" height="8" rx="1.5" />
      <rect class="ao-green ao-key" x="30" y="40" width="3" height="2" rx="0.5" />
      <rect class="ao-paper ao-key ao-late" x="34.5" y="40" width="3" height="2" rx="0.5" />
      <rect class="ao-green ao-key" x="39" y="40" width="3" height="2" rx="0.5" />
      <rect class="ao-paper" x="31" y="43" width="12" height="1.6" rx="0.8" />
      <path class="ao-code ao-pop" d="M33 33l-3 2.5 3 2.5M41 33l3 2.5-3 2.5" />
    </>
  ),
  // Warmup: a sweatband, and it hops through its reps.
  warmup: () => (
    <>
      <rect class="ao-pink" x="8" y="10" width="32" height="4" rx="2" />
      <path class="ao-paper" d="M40 9l2 3-4 0z" />
      <path class="ao-blue ao-drip" d="M41 16q2 3 0 4.5q-2-1.5 0-4.5z" />
      <rect class="ao-ink" x="32" y="40" width="14" height="3" rx="1.5" />
      <rect class="ao-orange" x="30" y="37" width="3.5" height="9" rx="1" />
      <rect class="ao-orange" x="44.5" y="37" width="3.5" height="9" rx="1" />
    </>
  ),
  // Growth: flight goggles up and a rocket that lifts off.
  growth: () => (
    <>
      <path class="ao-band ao-thin" d="M8 10h32" />
      <circle class="ao-blue" cx="18" cy="10" r="4" />
      <circle class="ao-blue" cx="30" cy="10" r="4" />
      <g class="ao-launch">
        <path class="ao-paper" d="M38 29q5 4 4 12h-8q-1-8 4-12z" />
        <circle class="ao-blue" cx="38" cy="35" r="1.6" />
        <path class="ao-orange" d="M34 41l-2 4 3-1zM42 41l2 4-3-1z" />
        <path class="ao-red ao-flame" d="M36 41h4l-2 5z" />
      </g>
    </>
  ),
  // Finances: a banker's green visor and coins that stack up.
  finances: () => (
    <>
      <path class="ao-green" d="M8 12q16-8 32 0l3 4q-19-6-38 0z" />
      <rect class="ao-ink" x="8" y="11" width="32" height="2" rx="1" />
      <ellipse class="ao-yellow" cx="38" cy="44" rx="7" ry="2.5" />
      <ellipse class="ao-yellow" cx="38" cy="40.5" rx="7" ry="2.5" />
      <ellipse class="ao-yellow ao-coin" cx="38" cy="37" rx="7" ry="2.5" />
      <path class="ao-code ao-pop" d="M44 27v8M46 29h-3a1.5 1.5 0 0 0 0 3h2a1.5 1.5 0 0 1 0 3h-3" />
    </>
  ),
  // The Voice Coach: a microphone on its stand; notes rise while it coaches.
  voice: () => (
    <>
      <path class="ao-band ao-thin" d="M38 47v-8M33 47h10" />
      <rect class="ao-ink" x="35" y="29" width="6" height="10" rx="3" />
      <path class="ao-band ao-thin" d="M33.5 35a4.5 4.5 0 0 0 9 0" />
      <path class="ao-pink ao-fly" d="M28 30v-6l4-1v6M28 30a1.5 1.5 0 1 1-1.5-1.5H28M32 29a1.5 1.5 0 1 1-1.5-1.5H32" />
    </>
  ),
  // The Thinking Coach: a thought bubble whose idea lights up.
  thinking: () => (
    <>
      <circle class="ao-paper" cx="38" cy="8" r="7.5" />
      <circle class="ao-paper" cx="31" cy="16" r="2" />
      <circle class="ao-paper" cx="28" cy="20" r="1.2" />
      <circle class="ao-yellow ao-glow" cx="38" cy="7" r="3.2" />
      <rect class="ao-ink" x="36.6" y="10" width="2.8" height="2" rx="0.6" />
    </>
  ),
  // The Chinese Coach: a brush that writes on a red scroll.
  chinese: () => (
    <>
      <rect class="ao-red" x="29" y="31" width="16" height="15" rx="1.5" />
      <rect class="ao-paper ao-type" x="32" y="35" width="10" height="1.8" rx="0.9" />
      <rect class="ao-paper ao-type ao-late" x="32" y="39" width="7" height="1.8" rx="0.9" />
      <g class="ao-brush">
        <rect class="ao-orange" x="42" y="22" width="2.4" height="10" rx="1" transform="rotate(25 43 27)" />
        <path class="ao-ink" d="M39 31l2.5 1.2-1.6 3z" />
      </g>
    </>
  ),
  // The English Coach: a graduation cap and a book whose pages turn.
  english: () => (
    <>
      <path class="ao-ink" d="M24 1l17 6-17 6-17-6z" />
      <path class="ao-ink" d="M14 10v4q10 4 20 0v-4l-10 3.5z" />
      <path class="ao-band ao-thin ao-yellow-stroke" d="M38 8v6" />
      <path class="ao-blue" d="M29 35q5-2 9 0v11q-4-2-9 0zM38 35q4-2 9 0v11q-5-2-9 0z" />
      <path class="ao-paper ao-page" d="M38 35q4-2 8 0v10q-4-2-8 0z" />
    </>
  ),
  // The Selfie Maker: a star hair clip and a phone on a selfie stick that flashes.
  selfie: () => (
    <>
      <path class="ao-yellow" d="M12 6l1.2 2.4 2.6.4-1.9 1.8.4 2.6-2.3-1.2-2.3 1.2.4-2.6-1.9-1.8 2.6-.4z" />
      <path class="ao-band ao-thin" d="M33 47l7-14" />
      <rect class="ao-pink" x="37" y="24" width="9" height="13" rx="2" transform="rotate(20 41.5 30.5)" />
      <circle class="ao-flash" cx="42" cy="28" r="5" />
    </>
  ),
};

export const hasAgentOutfit = (role: AgentWorkRole) => OUTFITS[role] !== undefined;

export function AgentOutfit(props: { role: AgentWorkRole; working: boolean }) {
  return (
    <Show when={OUTFITS[props.role]}>
      {(outfit) => (
        <svg
          class="agent-outfit"
          viewBox="0 0 48 48"
          data-role={props.role}
          data-working={props.working ? "" : undefined}
          aria-hidden="true"
        >
          {outfit()()}
        </svg>
      )}
    </Show>
  );
}
