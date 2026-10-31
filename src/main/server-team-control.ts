// HoleA.I: team setup from a server's terminal (`openbot team import|model|mcp|wake`), so a VPS server gets
// its agents, their models, its MCP servers and the hole.fm wake routines with no app. The same services as
// the app's dialogs. MCP sign-ins stay with the owner, in the app.
import { isAgentProvider } from "@openbot/contracts/agent-providers";
import type {
  AgentSummary,
  McpServerConfig,
  SaveMcpServerInput,
  SaveMcpSignInAppInput,
  UpdateAgentInput,
} from "@openbot/contracts/ipc";
import { isAgentModel } from "@openbot/contracts/ipc";
import type { SaveEventRoutineInput, SaveEventRoutineResult } from "@openbot/contracts/ipc-events";
import type { Effect } from "effect";
import { runCauseEffect } from "../backend/effect-boundary";
import type { AgentImportService } from "./agent-import-service";
import type { ServerTeamControl } from "./server-mode";

export interface ServerTeamControlOptions {
  agentImport: Pick<AgentImportService, "stage" | "apply">;
  listAgents(): AgentSummary[];
  updateAgent(input: UpdateAgentInput): Effect.Effect<unknown, { readonly cause: unknown }>;
  listMcpServers(): McpServerConfig[];
  saveMcpServer(input: SaveMcpServerInput): Effect.Effect<McpServerConfig[], { readonly cause: unknown }>;
  saveMcpSignInApp(input: SaveMcpSignInAppInput): Effect.Effect<unknown, { readonly cause: unknown }>;
  saveRoutine(input: SaveEventRoutineInput): Effect.Effect<SaveEventRoutineResult, { readonly cause: unknown }>;
  timezone(): string;
}

export function createServerTeamControl(options: ServerTeamControlOptions): ServerTeamControl {
  const agentNamed = (name: string) => {
    const wanted = name.trim().toLowerCase();
    const agent = options.listAgents().find((candidate) => candidate.name.toLowerCase() === wanted);
    if (!agent) throw new Error(`No agent is named "${name.trim()}".`);
    return agent;
  };
  return {
    async importTeam(path) {
      if (!path.startsWith("/")) throw new Error("Give the absolute path of the export on the server.");
      const preview = await runCauseEffect(options.agentImport.stage(path));
      const result = await runCauseEffect(
        options.agentImport.apply({
          token: preview.token,
          keys: preview.agents.map((agent) => agent.key),
          channelKeys: preview.channels.map((channel) => channel.key),
        }),
      );
      return {
        agents: result.agents.map((agent) => agent.name).join(", "),
        channels: result.channels.length,
        skipped: result.skipped.length + result.skippedChannels.length,
        warnings: [...preview.warnings, ...result.warnings].join(" | ") || null,
      };
    },
    async setModel(agentName, provider, model) {
      if (!isAgentProvider(provider)) throw new Error(`"${provider}" is not a provider.`);
      if (!isAgentModel(model)) throw new Error(`"${model}" is not a model name.`);
      const agent = agentNamed(agentName);
      await runCauseEffect(options.updateAgent({ agentId: agent.id, provider, model }));
      return { agent: agent.name, provider, model };
    },
    async addMcpServer(name, url, clientId) {
      const trimmed = name.trim();
      if (!trimmed || !/^https:\/\//u.test(url.trim())) throw new Error("Give a name and an https:// URL.");
      const existing = options.listMcpServers().find((server) => server.name.toLowerCase() === trimmed.toLowerCase());
      const config: McpServerConfig = {
        // A new server is saved with an empty id; the store gives it one.
        id: existing?.id ?? "",
        name: trimmed,
        transport: "http",
        enabled: true,
        command: "",
        args: [],
        env: [],
        envPassthrough: [],
        workingDirectory: "",
        url: url.trim(),
        headers: [],
      };
      const saved = await runCauseEffect(options.saveMcpServer({ config }));
      const id = saved.find((server) => server.name.toLowerCase() === trimmed.toLowerCase())?.id ?? config.id;
      if (clientId.trim())
        await runCauseEffect(
          options.saveMcpSignInApp({ mcpServerId: id, clientId: clientId.trim(), clientSecret: "", scope: "" }),
        );
      return { mcp: config.name, id, url: config.url, client_id: clientId.trim() || null };
    },
    async wakeRoutine(agentName, routineName, instruction) {
      const agent = agentNamed(agentName);
      const { routine, secret } = await runCauseEffect(
        options.saveRoutine({
          owner: { kind: "agent", id: agent.id },
          name: routineName.trim() || "hole.fm wake",
          instruction: instruction.trim() || "hole.fm woke you. Do the items in the message.",
          active: true,
          timezone: options.timezone(),
          trigger: { kind: "webhook", eventType: null, filters: [] },
        }),
      );
      return {
        agent: agent.name,
        routine: routine.id,
        url: routine.trigger.kind === "webhook" ? routine.trigger.url : null,
        secret: secret ?? null,
      };
    },
  };
}
