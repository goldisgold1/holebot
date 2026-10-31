// See solid-js.ts. None of these functions run when the native adapter uses BotEngine.
function unsupportedSolidWebUi(): never {
  throw new Error("The web renderer from bloub is not available in the native app.");
}

export const Dynamic = unsupportedSolidWebUi;
export const mergeProps = unsupportedSolidWebUi;
export const ssr = unsupportedSolidWebUi;
export const ssrAttribute = unsupportedSolidWebUi;
export const ssrClassName = unsupportedSolidWebUi;
export const ssrGroup = unsupportedSolidWebUi;
export const ssrHydrationKey = unsupportedSolidWebUi;
export const ssrStyle = unsupportedSolidWebUi;

const escapeHtml = unsupportedSolidWebUi;

export { escapeHtml as escape };

// The bundle calls these when it loads (the web build runs it in the page), so they return the stub
// instead of throwing. The returned functions still throw if anything renders with them.
export const template = () => unsupportedSolidWebUi;
export const delegateEvents = () => {};
