import type { AppLogoVariant } from "@openbot/brand";
import type { AgentModelId, AgentProviderId, AppSetupState, DesktopPlatform } from "@openbot/contracts/ipc";
import { Button, ErrorReference } from "@openbot/ui";
import { useText } from "@openbot/ui/text";
import { createEffect, createSignal, createStore, createUniqueId, For, Match, Show, Switch, untrack } from "solid-js";
import { desktopAnalytics } from "../../analytics";
import { ComputerUseSetup } from "../computer-use/ComputerUseSetup";
import { FirstRunChoice } from "./FirstRunChoice";
import { FirstRunLaunch } from "./FirstRunLaunch";
import { FirstRunPlanStep } from "./FirstRunPlanStep";
import { FirstRunRoleStep } from "./FirstRunRoleStep";
import { firstRunTransition } from "./first-run-transition";
import { OnboardingComputerVisual } from "./OnboardingComputerVisual";
import { createOnboardingAvatarVariant, createOnboardingTeam, onboardingSessionSeed } from "./onboarding-avatars";
import type { OnboardingJourney } from "./onboarding-context";
import { onboardingPort } from "./onboarding-port";
import { FREE_PROVIDER } from "./onboarding-provider-rows";
import { type OnboardingRoleId, rememberStarterAgents, roleStarters } from "./onboarding-roles";
import { createSetupProviders, type SetupProviderProps } from "./SetupProviderPicker";
import { createSetupNext } from "./setup-next";

export interface FirstRunFlowProps extends SetupProviderProps {
  state: AppSetupState;
  platform: DesktopPlatform;
  /**
   * Records the choice. The model is `null` for a built-in provider, which keeps its own default, and
   * names the endpoint the user just described when they chose their own.
   */
  onSave: (provider: AgentProviderId, model: AgentModelId | null, journey: OnboardingJourney) => Promise<void>;
  /**
   * Records the product analytics choice when the user answers the first question. The box starts
   * ticked only in a region that allows it; a setup that never records a choice saves "off".
   * `chosen` is true when the user changed the box, so the account keeps only a real answer.
   */
  onAnalyticsChoice: (enabled: boolean, chosen: boolean) => void;
  /** Runs when the provider step is shown. First run scans once, so the host ignores a repeat. */
  onProviderStepShown?: () => void;
  /** The logo colour of this build, for the splash that shows while the app opens. */
  logoVariant?: AppLogoVariant;
}

const TEAM_SIZE = 7;
const TERMS_URL = "https://openbot.run/terms";
const PRIVACY_URL = "https://openbot.run/privacy";

type FirstRunStep = "choose" | "role" | "plan" | "computer";
/** How the user starts: on free models, or on a plan they connect. `null` until they choose. */
type FirstRunPath = "free" | "plan" | null;

interface FirstRunState {
  step: FirstRunStep;
  path: FirstRunPath;
  saving: boolean;
  /** The user asked to open OpenBot before the provider was ready, so setup ends when it is. */
  finishWhenReady: boolean;
  /** The user left the plan step with "Start free instead". */
  skipped: boolean;
  /** Clear until main says that the region of this computer allows analytics by default. */
  analytics: boolean;
  /** The user changed the box, so a late regional default does not replace their choice. */
  analyticsTouched: boolean;
  /** What the user works on most. `null` until they answer, or when they skip the question. */
  role: OnboardingRoleId | null;
  /** The starter agents chosen on the role step, in the order they were chosen. */
  starters: string[];
  /** Setup stopped while the user waited: the setup screen offers to try again. */
  setupFailed: boolean;
}

/**
 * First run with one question first: start free, or connect a plan. The free path needs no
 * sign-in. Its provider downloads from the moment first run opens, so it is often ready when the
 * user chooses. Both paths then ask what the user works on most, which chooses a few starter agents
 * for the first-agent form (the user can skip it). Only macOS asks for the Computer Use permissions;
 * other systems have none. While setup finishes, the setup screen shows its progress, and when it
 * fails it offers to try again.
 */
export function FirstRunFlow(props: FirstRunFlowProps) {
  const { t, errorMessage } = useText();
  const [state, setState] = createStore<FirstRunState>({
    step: "choose",
    path: null,
    saving: false,
    finishWhenReady: false,
    skipped: false,
    analytics: false,
    analyticsTouched: false,
    role: null,
    starters: [],
    setupFailed: false,
  });
  // A failed read keeps the box clear, which is the consent answer.
  void onboardingPort()
    .getAnalyticsDefault()
    .then(({ enabled }) =>
      setState((current) => {
        if (!current.analyticsTouched) current.analytics = enabled;
      }),
    )
    .catch(() => undefined);
  /**
   * The first-run screen sits on the dialog layer, so a row menu portalled to `body` would paint
   * behind it. Menus mount here instead.
   */
  const [screenElement, setScreenElement] = createSignal<HTMLElement | undefined>();
  const providers = createSetupProviders(props, undefined, { includeFree: () => state.path !== "plan" });
  const next = createSetupNext(providers);
  const nextReasonId = createUniqueId();
  const computerAvatar = createOnboardingAvatarVariant(onboardingSessionSeed(), "computer");
  // The first screen and the splash show the same team, so the agents that greet the user also jump
  // while the app opens.
  const team = createOnboardingTeam(onboardingSessionSeed(), TEAM_SIZE);
  /** The free provider downloads once on its own. A failed download waits for the user. */
  let freeDownloadRequested = false;
  /** The free provider is started once on its own. A failed start waits for the user. */
  let freeStartRequested = false;

  const stepsFor = (path: FirstRunPath): FirstRunStep[] => {
    const permissions: FirstRunStep[] = props.platform === "darwin" ? ["computer"] : [];
    return path === "plan" ? ["choose", "role", "plan", ...permissions] : ["choose", "role", ...permissions];
  };
  const steps = () => stepsFor(state.path);
  const stepNumber = () => steps().indexOf(state.step) + 1;
  const lastStep = () => stepNumber() === steps().length;
  const option = (provider: AgentProviderId | null) =>
    providers.options().find((candidate) => candidate.id === provider);

  createEffect(
    () => state.step === "plan",
    (shown) => {
      if (shown) untrack(() => props.onProviderStepShown?.());
    },
  );

  // Most users start free, so its download starts before they choose. It waits until the status says
  // there is no OpenCode CLI: a user with their own gets no download. It goes to the host directly,
  // because the row action would also choose the provider and fix the plan rows before the user saw
  // them. A failed request leaves the provider not downloaded; "Start free" tries again and says why.
  createEffect(
    () => {
      const free = option(FREE_PROVIDER);
      return free?.state === "not-installed" && free.runtimeStatus?.phase === "not-downloaded";
    },
    (missing) => {
      if (!missing || freeDownloadRequested) return;
      freeDownloadRequested = true;
      untrack(() => void Promise.resolve(props.onDownloadProvider?.(FREE_PROVIDER)).catch(() => undefined));
    },
  );

  // The free provider starts when its runtime is on disk. The first connection only asks the CLI
  // for its models, and the permission step gives it time to answer. A provider refresh ignores a
  // connection, so the start waits for it to end.
  createEffect(
    () => {
      const free = state.path === "free" ? option(FREE_PROVIDER) : undefined;
      return Boolean(
        free &&
          !props.refreshingProviders &&
          (free.runtimeStatus?.phase ?? "ready") === "ready" &&
          free.state !== "available" &&
          free.connectionState !== "connecting",
      );
    },
    (startable) => {
      if (!startable || freeStartRequested) return;
      freeStartRequested = true;
      untrack(() => void providers.connectProvider(FREE_PROVIDER).then(stopWaitUnlessSent));
    },
  );

  // Open waits for the provider; a failed download or start stops the wait, and the reason says why.
  // A request that fails before either begins stops it in `stopWaitUnlessSent`.
  createEffect(
    () => ({
      waiting: state.finishWhenReady,
      ready: providers.selectedProviderConnected(),
      failed:
        option(providers.selectedProvider())?.runtimeStatus?.phase === "download-error" ||
        option(providers.selectedProvider())?.state === "error",
    }),
    ({ waiting, ready, failed }) => {
      if (!waiting) return;
      if (ready) untrack(() => void finish());
      else if (failed)
        setState((current) => {
          current.finishWhenReady = false;
          current.setupFailed = true;
        });
    },
  );

  /** Records an action on the step shown now, with the path the user chose. */
  function trackStep(action: "viewed" | "next" | "back" | "skipped", path: FirstRunPath = state.path): void {
    desktopAnalytics.track("onboarding_step", { step: state.step, action, ...(path ? { path } : {}) });
  }
  createEffect(
    () => state.step,
    () => untrack(() => trackStep("viewed")),
  );

  function moveTo(step: FirstRunStep): void {
    providers.clearErrors();
    void firstRunTransition("step", () => {
      setState((current) => {
        current.step = step;
      });
    });
  }

  // A write shows in reads only after the next flush, so this reads no state that it writes.
  function startFree(): void {
    const fromPlan = state.step === "plan";
    if (!fromPlan) props.onAnalyticsChoice(state.analytics, state.analyticsTouched);
    trackStep(fromPlan ? "skipped" : "next", "free");
    providers.chooseProvider(FREE_PROVIDER);
    setState((current) => {
      current.path = "free";
      if (fromPlan) current.skipped = true;
    });
    retryFree();
    // The step after the first question. The plan step's "Start free instead" comes after the role
    // question, which the user already answered, so it lands on the step after that one.
    const freeSteps = stepsFor("free");
    const following = fromPlan ? freeSteps[freeSteps.indexOf("role") + 1] : freeSteps[1];
    if (following) {
      moveTo(following);
      return;
    }
    // With no other step, the role question is where the user waits for the free provider. The
    // wait opens the app when it is ready, at once if it is ready now.
    if (state.step !== "role") moveTo("role");
    setState((current) => {
      current.finishWhenReady = true;
    });
  }

  function usePlan(): void {
    if (providers.selectedProvider() === FREE_PROVIDER && !providers.customSelected()) providers.clearChoice();
    props.onAnalyticsChoice(state.analytics, state.analyticsTouched);
    trackStep("next", "plan");
    setState((current) => {
      current.path = "plan";
    });
    // The role question comes first on both paths; the plan list follows it.
    moveTo("role");
  }

  /** An answer chooses its starter agents again, so the cards always match the answer shown. */
  function chooseRole(role: OnboardingRoleId): void {
    setState((current) => {
      current.role = role;
      current.starters = roleStarters(role);
    });
  }

  function toggleStarter(id: string): void {
    setState((current) => {
      current.starters = current.starters.includes(id)
        ? current.starters.filter((starter) => starter !== id)
        : [...current.starters, id];
    });
  }

  /** Skips the role question: no starter agents are chosen, and first run goes on as Next would. */
  function skipRole(): void {
    trackStep("skipped");
    setState((current) => {
      current.role = null;
      current.starters = [];
    });
    rememberStarterAgents([]);
    const following = steps()[stepNumber()];
    if (following) moveTo(following);
    else openWhenReady();
  }

  /** Only the plan step and Open wait for the provider: the free path continues while it starts. */
  function nextStep(): void {
    const following = steps()[stepNumber()];
    // A blocked plan step only starts the connection, so it is not a "next".
    if (following && state.step === "plan" && !providers.selectedProviderConnected()) {
      next.connectSelected();
      return;
    }
    trackStep("next");
    if (state.step === "role") rememberStarterAgents(state.starters);
    if (following) moveTo(following);
    else openWhenReady();
  }

  function openWhenReady(): void {
    if (providers.selectedProviderConnected()) {
      void finish();
      return;
    }
    if (state.path !== "free") {
      next.connectSelected();
      return;
    }
    retryFree();
    setState((current) => {
      current.finishWhenReady = true;
    });
  }

  /** Downloads the free provider again, or starts it again, after it failed. */
  function retryFree(): void {
    const free = option(FREE_PROVIDER);
    const phase = free?.runtimeStatus?.phase;
    if (phase === "not-downloaded" || phase === "download-error") {
      freeDownloadRequested = true;
      void providers.downloadProvider(FREE_PROVIDER).then(stopWaitUnlessSent);
      return;
    }
    if (free?.state === "error") {
      freeStartRequested = true;
      void providers.connectProvider(FREE_PROVIDER).then(stopWaitUnlessSent);
    }
  }

  /** A rejected request changes no provider status, so the wait for the provider stops here. */
  function stopWaitUnlessSent(sent: boolean): void {
    if (sent) return;
    setState((current) => {
      // Only a wait the user started becomes a failure; a background start that fails waits for them.
      if (current.finishWhenReady) current.setupFailed = true;
      current.finishWhenReady = false;
    });
  }

  /** "Try again" on the setup screen: the wait starts again, and the download or start runs again. */
  function retrySetup(): void {
    providers.setError("");
    setState((current) => {
      current.setupFailed = false;
    });
    openWhenReady();
  }

  /** "Back" on the setup screen: the steps show again, with the reason under them. */
  function leaveFailedSetup(): void {
    setState((current) => {
      current.setupFailed = false;
    });
  }

  function previousStep(): void {
    const previous = steps()[stepNumber() - 2];
    if (!previous) return;
    trackStep("back");
    moveTo(previous);
  }

  async function finish(): Promise<void> {
    const provider = providers.selectedProvider();
    if (!provider || !providers.selectedProviderConnected() || state.saving) return;
    setState((current) => {
      current.saving = true;
      current.finishWhenReady = false;
    });
    providers.setError("");
    try {
      // A built-in provider keeps its own default model, so only the custom row sends one.
      await props.onSave(provider, providers.customSelected() ? providers.customModel() : null, {
        ...(state.path ? { path: state.path } : {}),
        skipped: state.skipped,
      });
    } catch (cause) {
      providers.setError(errorMessage(cause, t("onboarding.error.finish")), cause);
      setState((current) => {
        current.saving = false;
        current.setupFailed = true;
      });
    }
  }

  const busy = () => state.saving || state.finishWhenReady;
  /** The setup screen shows while first run waits to open the app, and after that wait failed. */
  const launchWanted = () => busy() || state.setupFailed;
  /** While first run waits to open the app, the splash covers the steps. It comes and goes in a transition. */
  const [launchShown, setLaunchShown] = createSignal(false);
  createEffect(launchWanted, (waiting) => {
    if (waiting === launchShown()) return;
    // The update runs a frame later. Saving can fail before it, so it reads the state it applies then.
    void firstRunTransition("open", () => {
      setLaunchShown(launchWanted());
    });
  });
  const stepsShown = () => !launchShown();
  const freeStatus = () => (state.path === "free" ? option(FREE_PROVIDER)?.runtimeStatus : undefined);
  const logoVariant = () => props.logoVariant ?? "production";
  const freeDownloading = () => freeStatus()?.phase === "downloading";
  const freeProgress = () => freeStatus()?.progress ?? null;
  const mainLabel = () => {
    if (lastStep()) return t("onboarding.action.open");
    if (state.step === "plan" && !providers.selectedProviderConnected()) {
      // The button then starts the download, so it says so.
      const phase = option(providers.selectedProvider())?.runtimeStatus?.phase;
      return phase === "not-downloaded" || phase === "download-error"
        ? t("common.download")
        : t("onboarding.action.connect");
    }
    return t("onboarding.action.next");
  };
  /**
   * The reason shows only where the user waits for the provider. The free path does not wait on
   * the permission step, and the first question waits only when it is also the last step.
   */
  const blockedReason = () => {
    if (state.step === "choose" ? state.path !== "free" || !lastStep() : state.path === "free" && !lastStep()) {
      return "";
    }
    return next.blockedReason();
  };

  return (
    <main
      class="onboarding-screen first-run-screen"
      data-step={state.step}
      ref={(element) => setScreenElement(element)}
    >
      <Show
        when={stepsShown()}
        fallback={
          <FirstRunLaunch
            team={team}
            variant={logoVariant()}
            downloading={freeDownloading()}
            progress={freeProgress()}
            failed={state.setupFailed}
            reason={providers.error()}
            onRetry={retrySetup}
            onBack={leaveFailedSetup}
          />
        }
      >
        <div class="onboarding-shell">
          <Show when={state.step !== "choose"}>
            <nav
              class="onboarding-progress"
              aria-label={t("onboarding.progress", { step: stepNumber(), total: steps().length })}
            >
              <For each={steps()}>
                {(_item, index) => (
                  <span
                    class={index() + 1 === stepNumber() ? "is-active" : index() + 1 < stepNumber() ? "is-complete" : ""}
                  />
                )}
              </For>
            </nav>
          </Show>

          <div class="onboarding-step" data-step={state.step}>
            <Switch>
              <Match when={state.step === "choose"}>
                <FirstRunChoice
                  team={team}
                  disabled={busy()}
                  loading={busy()}
                  reason={blockedReason()}
                  onStartFree={startFree}
                  onUsePlan={usePlan}
                  analytics={state.analytics}
                  onAnalyticsChange={(enabled) =>
                    setState((current) => {
                      current.analytics = enabled;
                      current.analyticsTouched = true;
                    })
                  }
                  onOpenTerms={() => void onboardingPort().openUrl(TERMS_URL)}
                  onOpenPrivacy={() => void onboardingPort().openUrl(PRIVACY_URL)}
                />
              </Match>

              <Match when={state.step === "role"}>
                <FirstRunRoleStep
                  role={state.role}
                  starters={state.starters}
                  disabled={busy()}
                  onRoleChange={chooseRole}
                  onToggleStarter={toggleStarter}
                />
              </Match>

              <Match when={state.step === "plan"}>
                <FirstRunPlanStep providers={providers} disabled={busy()} menuMount={screenElement()} />
              </Match>

              <Match when={state.step === "computer"}>
                <section class="onboarding-panel onboarding-panel-computer" aria-labelledby="onboarding-title">
                  <h1 id="onboarding-title">{t("onboarding.computer.title")}</h1>
                  <OnboardingComputerVisual avatar={computerAvatar} />
                  <ComputerUseSetup variant="compact" />
                </section>
              </Match>
            </Switch>
          </div>

          <Show when={providers.error()}>
            <p class="onboarding-error" role="alert">
              {providers.error()}
              <ErrorReference reference={providers.errorReference()} />
            </p>
          </Show>

          <Show when={state.step !== "choose"}>
            <div class="onboarding-actions">
              <Button type="button" variant="outline" class="onboarding-back" disabled={busy()} onClick={previousStep}>
                {t("common.back")}
              </Button>
              <Button
                type="button"
                variant="default"
                class="onboarding-next"
                aria-describedby={blockedReason() ? nextReasonId : undefined}
                loading={busy()}
                loadingLabel={t("onboarding.opening")}
                onClick={nextStep}
              >
                {mainLabel()}
              </Button>
              {/* Named by the button above, so the reason is read out with it rather than hunted for. */}
              <Show when={blockedReason()}>
                {(reason) => (
                  <p class="onboarding-next-reason" id={nextReasonId}>
                    {reason()}
                  </p>
                )}
              </Show>
              <Show when={state.step === "plan"}>
                <Button type="button" variant="ghost" disabled={busy()} onClick={startFree}>
                  {t("onboarding.choice.startFreeInstead")}
                </Button>
              </Show>
              <Show when={state.step === "role"}>
                <Button type="button" variant="ghost" disabled={busy()} onClick={skipRole}>
                  {t("onboarding.action.skip")}
                </Button>
              </Show>
            </div>
          </Show>
        </div>
      </Show>
    </main>
  );
}
