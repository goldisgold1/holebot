import { createFileRoute, redirect } from "@tanstack/solid-router";

// HoleA.I has no public website: the root opens the web app, which asks for sign-in.
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/app" });
  },
});
