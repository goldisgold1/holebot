// The footer of the few pages outside the app. HoleA.I has no public website, so it carries no links.
export function LandingFooter() {
  return (
    <footer class="landing-footer" data-slot="landing-footer">
      <div class="landing-footer-inner">
        <div class="landing-footer-bottom" data-revealed="true">
          <p>&copy; {new Date().getFullYear()} HoleA.I. Internal use only.</p>
        </div>
      </div>
    </footer>
  );
}
