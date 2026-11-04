import { prefersReducedMotion } from "@openbot/ui/utils";
import { onCleanup, onSettled } from "solid-js";

interface SmoothHeightResizeOptions {
  container: () => HTMLElement | undefined;
  content: () => HTMLElement | undefined;
  enabled?: () => boolean;
  skip?: () => boolean;
}

export function createSmoothHeightResize(options: SmoothHeightResizeOptions): void {
  let animation: Animation | undefined;
  let previousHeight: number | undefined;

  const finishAnimation = (current?: Animation) => {
    if (current && animation !== current) return;
    animation = undefined;
    options.container()?.removeAttribute("data-resizing");
  };

  const cancelAnimation = () => {
    animation?.cancel();
    finishAnimation();
  };

  onSettled(() => {
    const observer = new ResizeObserver(() => {
      const container = options.container();
      const content = options.content();
      if (!container || !content) return;
      const nextHeight = content.getBoundingClientRect().height;
      const previous = previousHeight;
      previousHeight = nextHeight;
      if (
        previous === undefined ||
        previous === nextHeight ||
        options.enabled?.() === false ||
        prefersReducedMotion()
      ) {
        return;
      }
      if (options.skip?.()) {
        cancelAnimation();
        return;
      }

      const animatedHeight = Number.parseFloat(getComputedStyle(container).height);
      const startHeight = animation && Number.isFinite(animatedHeight) ? animatedHeight : previous;
      animation?.cancel();
      container.setAttribute("data-resizing", "true");
      const current = container.animate([{ height: `${startHeight}px` }, { height: `${nextHeight}px` }], {
        duration: resizeDuration(),
        easing: resizeEasing(),
      });
      animation = current;
      void current.finished.then(() => finishAnimation(current)).catch(() => undefined);
    });
    const content = options.content();
    if (content) observer.observe(content);
    return () => observer.disconnect();
  });

  onCleanup(cancelAnimation);
}

// HoleA.I (from Vincent's bot app): a row settles to its new height over 200ms on the standard curve.
function resizeDuration(): number {
  return 200;
}

function resizeEasing(): string {
  return "cubic-bezier(0.2, 0, 0, 1)";
}
