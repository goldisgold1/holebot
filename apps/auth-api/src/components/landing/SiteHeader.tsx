import { AppLogo } from "@openbot/brand";
import { ButtonLink } from "../ui/button";

export interface SiteHeaderProps {
  page: "content";
}

// The header of the few pages outside the app: shared agents, sign-in results and Not found. HoleA.I has no
// public website, so it links only to the app. It keeps the `landing-header` class for the shared styles.
export function SiteHeader(_props: SiteHeaderProps) {
  return (
    <header class="landing-header" data-enter="header">
      <a href="/app" class="site-logo-link" aria-label="Open the app">
        <AppLogo variant="production" class="landing-brand-logo" />
      </a>
      <div class="site-header-actions">
        {/* A full page load: the /app route brings the desktop document styles. */}
        <ButtonLink to="/app" reloadDocument variant="primary" size="sm" icon="arrow-right">
          App
        </ButtonLink>
      </div>
    </header>
  );
}
