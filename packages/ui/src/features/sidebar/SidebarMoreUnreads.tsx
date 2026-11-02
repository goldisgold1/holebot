/**
 * The "More unreads" pills over the agent list. A row with unread messages carries
 * `data-sidebar-unread` (its count); when such a row is scrolled out of view, a pill floats at that
 * edge of the list and scrolls to the nearest one.
 *
 * Each pill sits in a zero-height sticky anchor inside the scrolling list, the top one first and the
 * bottom one last, so it stays at the list edge without a wrapper around the list. Rows in a collapsed
 * section are inert and do not count.
 */

import { ArrowDown, ArrowUp, Button } from "@openbot/ui";
import type { JSX } from "@solidjs/web";
import { createEffect, createSignal, Show } from "solid-js";
import { useText } from "../../text";
import { prefersReducedMotion } from "../../utils";

type UnreadEdge = "above" | "below";

interface OffscreenUnreads {
  count: number;
  /** The unread row nearest the edge, the one a click scrolls to. */
  nearest: HTMLElement;
}

export function createSidebarMoreUnreads(list: () => HTMLElement | undefined, enabled: () => boolean) {
  const [above, setAbove] = createSignal<OffscreenUnreads | null>(null);
  const [below, setBelow] = createSignal<OffscreenUnreads | null>(null);

  function measure(element: HTMLElement) {
    const bounds = element.getBoundingClientRect();
    let aboveCount = 0;
    let belowCount = 0;
    let aboveNearest: HTMLElement | undefined;
    let belowNearest: HTMLElement | undefined;
    for (const row of element.querySelectorAll<HTMLElement>("[data-sidebar-unread]")) {
      if (row.closest("[inert]")) continue;
      const rect = row.getBoundingClientRect();
      if (rect.height === 0) continue;
      const count = Number(row.dataset.sidebarUnread) || 1;
      const middle = rect.top + rect.height / 2;
      if (middle < bounds.top) {
        // Rows come in document order, so the last one above is the nearest.
        aboveCount += count;
        aboveNearest = row;
      } else if (middle > bounds.bottom) {
        belowCount += count;
        belowNearest ??= row;
      }
    }
    setAbove(aboveNearest ? { count: aboveCount, nearest: aboveNearest } : null);
    setBelow(belowNearest ? { count: belowCount, nearest: belowNearest } : null);
  }

  createEffect(
    () => (enabled() ? list() : undefined),
    (element) => {
      if (!element) {
        setAbove(null);
        setBelow(null);
        return;
      }
      let frame = 0;
      const schedule = () => {
        if (frame) return;
        frame = window.requestAnimationFrame(() => {
          frame = 0;
          measure(element);
        });
      };
      schedule();
      element.addEventListener("scroll", schedule, { passive: true });
      const resize = new ResizeObserver(schedule);
      resize.observe(element);
      const mutations = new MutationObserver(schedule);
      mutations.observe(element, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["data-sidebar-unread", "data-collapsed", "inert"],
      });
      return () => {
        window.cancelAnimationFrame(frame);
        element.removeEventListener("scroll", schedule);
        resize.disconnect();
        mutations.disconnect();
      };
    },
  );

  const jump = (edge: UnreadEdge) => {
    const target = (edge === "above" ? above() : below())?.nearest;
    target?.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };

  return { above, below, jump };
}

export type SidebarMoreUnreads = ReturnType<typeof createSidebarMoreUnreads>;

/** One pill and its sticky anchor. `edge` says which side of the list it sits on. */
export function SidebarMoreUnreadsPill(props: { edge: UnreadEdge; unreads: SidebarMoreUnreads }): JSX.Element {
  const { t } = useText();
  const offscreen = () => (props.edge === "above" ? props.unreads.above() : props.unreads.below());
  return (
    <div class="sidebar-more-unreads-anchor" data-edge={props.edge}>
      <Show when={offscreen()}>
        {(unreads) => (
          <Button
            variant="ghost"
            type="button"
            class="sidebar-more-unreads"
            aria-label={props.edge === "above" ? t("sidebar.moreUnreads.above") : t("sidebar.moreUnreads.below")}
            title={t("sidebar.moreUnreads.count", { count: unreads().count })}
            onClick={() => props.unreads.jump(props.edge)}
          >
            <Show when={props.edge === "above"} fallback={<ArrowDown aria-hidden="true" />}>
              <ArrowUp aria-hidden="true" />
            </Show>
            <span>{t("sidebar.moreUnreads.label")}</span>
          </Button>
        )}
      </Show>
    </div>
  );
}
