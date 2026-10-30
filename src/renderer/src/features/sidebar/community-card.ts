/**
 * Whether the sidebar shows the community card, for the desktop sidebar and the web client. The card
 * invited people to the previous owner's Discord and X; HoleA.I builds are internal, so it never shows.
 */
export function createCommunityCardVisibility() {
  return {
    dismissed: () => true,
    dismiss: () => {},
  };
}
