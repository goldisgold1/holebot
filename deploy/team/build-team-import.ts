// Builds deploy/team/holeai-team-import.zip: the hole.fm bot team as OpenBot agents, in the format that
// Server settings > Import reads (resources/agent-import/grok-bot/SKILL.md). Each agent gets its role skill and
// the team rules as skills, with a header that maps the Grok wording to OpenBot on Claude.
//   bash deploy/team/pull-skills.sh            refresh source-skills/ from hole.fm (needs the VPS SSH key)
//   bun deploy/team/build-team-import.ts       write the zip and check it with OpenBot's own manifest decoder
//
// Grok Bot exports: put each bot's self-export in deploy/team/grok-export/<name>.md (any name that matches the
// role key, the role name or the Grok bot's name, e.g. cos-secretary.md, reels-producer.md). Sections:
// DESCRIPTION, MEMORIES (one item per "-" or "1." line), ROUTINES, FILES. Memories become the agent's
// memories; the rest becomes a "grok-bot-export" skill, so nothing is cut to the description limit.
// Timed routines are not recreated on purpose: hole.fm wakes the agents.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createOpenBotLogger } from "@openbot/logging";
import { strToU8, zipSync } from "fflate";
import { readSkillFrontmatter } from "../../src/backend/skill-frontmatter";
import { decodeImportManifest } from "../../src/main/agent-import-manifest";

const logger = createOpenBotLogger("build-team-import");
const here = import.meta.dir;
const SNAPSHOT = new Date().toISOString().slice(0, 10);
const TEAM_RULES = "grok-team-rules";

interface Role {
  key: string;
  name: string;
  title: string;
  /** The hole.fm skill ids, the role's own first. */
  skills: string[];
  /** The `bot` value for bridge claims and the hole.fm wake bot id, as the Grok bot used them. */
  bot: string;
  wake: string | null;
  focus: string;
}

const ROLES: Role[] = [
  {
    key: "chief",
    name: "Chief of Staff",
    title: "Front door for Vincent and Elle; runs the team",
    skills: ["grok-chief-of-staff", "grok-problems-and-triage"],
    bot: "grok-chief",
    wake: "chief",
    focus:
      "You are the front door: Vincent (CEO) and Elle (COO) talk to you; you route work to the other agents, watch stuck items, failed wakes, caps and account alerts, and raise owner calls.",
  },
  {
    key: "strategist",
    name: "Strategist",
    title: "Clusters, tests and what to make next",
    skills: ["grok-strategist"],
    bot: "grok-strategist",
    wake: "strategist",
    focus:
      "You decide what the team tests and makes next: clusters, test cards, source choices and the decisions the hourly rules leave.",
  },
  {
    key: "producer",
    name: "Producer",
    title: "Reels, carousels and Stories through bridge jobs",
    skills: ["grok-producer", "reels-factory-worker"],
    bot: "grok-producer",
    wake: "producer",
    focus:
      "You turn approved Test cards into finished media: claim bridge jobs, make first frames and videos on Vincent's Higgsfield, run the gates and hand off to the Publisher.",
  },
  {
    key: "publisher",
    name: "Publisher",
    title: "Posts what the Producer hands over",
    skills: ["grok-publisher"],
    bot: "grok-publisher",
    wake: "publisher",
    focus: "You post what the Producer hands over, at the declared cadence, through the hole.fm posting tools.",
  },
  {
    key: "analyst",
    name: "Analyst",
    title: "Reads, data checks and verdicts",
    skills: ["grok-analyst"],
    bot: "grok-analyst",
    wake: "analyst",
    focus:
      "You own the numbers: every read at the right age, the data checks, source reviews and the verdicts the rules need.",
  },
  {
    key: "growth",
    name: "Growth",
    title: "Scales what passed Stage A",
    skills: ["grok-growth", "grok-warmup"],
    bot: "grok-growth",
    wake: null,
    focus:
      "You start once a Cluster x Format has passed Stage A and an account is ready: you scale it, and you run account warm-ups.",
  },
  {
    key: "story-maker",
    name: "Story Maker",
    title: "Story inspiration library",
    skills: ["grok-story-maker"],
    bot: "grok-story-maker",
    wake: "story_maker",
    focus: "You collect and label Story inspiration for the library the Image Producer works from.",
  },
  {
    key: "image-producer",
    name: "Image Producer",
    title: "Scarlett's Story images",
    skills: ["grok-image-producer"],
    bot: "grok-image-producer",
    wake: null,
    focus:
      "You make Scarlett's Story images through image jobs on Vincent's Higgsfield, with the WaveSpeed fallback the skill names.",
  },
  {
    key: "carousel-maker",
    name: "Carousel Maker",
    title: "Source-linked Instagram carousels",
    skills: ["reels-carousel-factory", "carousel-intelligence"],
    bot: "grok-carousel-maker",
    wake: "carousel_maker",
    focus: "You plan and produce source-linked Instagram carousels from the carousel cluster registry.",
  },
  {
    key: "rosie",
    name: "Rosie",
    title: "COO assistant for Elle",
    skills: ["grok-rosie", "grok-problems-and-triage"],
    bot: "grok-rosie",
    wake: "rosie",
    focus: "You keep Elle's (COO) side moving: her readiness, setup and posting items, and the COO problems list.",
  },
];

/** Names the Grok bots go by in Vincent's Grok Bot, beside the role key and name. */
const GROK_NAMES: Record<string, string[]> = {
  chief: ["cos-secretary", "cos", "chief-of-staff"],
  producer: ["reels-producer"],
  growth: ["warmup"],
};
const MEMORY_LIMIT = 64;
const MEMORY_TEXT = 500;
const BASE_MEMORIES = [
  "Vincent is the CEO and makes every owner call; Elle is the COO (setup, readiness, content, posting, readings).",
  "Generation: Kling only through the official Kling MCP; everything else through the hole.fm generation app. Reel first frames and videos on Vincent's Higgsfield.",
];

interface GrokExport {
  file: string;
  memories: string[];
  /** DESCRIPTION, ROUTINES and FILES as written by the bot. */
  rest: string;
}

const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "");

function readGrokExports(): Map<string, GrokExport> {
  const dir = join(here, "grok-export");
  const found = new Map<string, GrokExport>();
  if (!existsSync(dir)) return found;
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".md"))) {
    const name = slug(file.replace(/\.md$/u, ""));
    const role = ROLES.find((r) => [r.key, slug(r.name), ...(GROK_NAMES[r.key] ?? [])].includes(name));
    if (!role) throw new Error(`grok-export/${file}: no role matches this name. Rename it to a role key.`);
    if (found.has(role.key)) throw new Error(`grok-export/${file}: a second export for ${role.key}.`);
    const text = readFileSync(join(dir, file), "utf8").replace(/\r\n/gu, "\n");
    // Split on the section headings the export prompt asks for ("## MEMORIES", "MEMORIES:", ...).
    const sections = new Map<string, string>();
    let current = "DESCRIPTION";
    for (const line of text.split("\n")) {
      const heading = /^\s*#*\s*\**(DESCRIPTION|MEMORIES|ROUTINES|FILES)\**\s*:?\s*$/iu.exec(line);
      if (heading) current = heading[1].toUpperCase();
      else sections.set(current, `${sections.get(current) ?? ""}${line}\n`);
    }
    const memories = (sections.get("MEMORIES") ?? "")
      .split("\n")
      .map((line) => /^\s*(?:[-*•]|\d+[.)])\s+(.+)$/u.exec(line)?.[1]?.trim() ?? "")
      .filter(Boolean);
    const long = memories.filter((m) => m.length > MEMORY_TEXT);
    const rest = ["DESCRIPTION", "ROUTINES", "FILES"]
      .map((section) => `## ${section}\n\n${(sections.get(section) ?? "").trim() || "(none)"}`)
      .join("\n\n");
    found.set(role.key, {
      file,
      // A memory over the limit would be dropped by the import; it goes to the export skill instead.
      memories: memories.filter((m) => m.length <= MEMORY_TEXT),
      rest: long.length ? `${rest}\n\n## LONGER MEMORIES\n\n${long.map((m) => `- ${m}`).join("\n")}` : rest,
    });
  }
  return found;
}

function exportSkillFile(role: Role, exported: GrokExport): string {
  return [
    "---",
    "name: grok-bot-export",
    `description: "What the Grok Bot ${role.name} knew before the move: its own description, routines, files it used and memories too long for the memory list. Read when a task depends on how the Grok bot worked."`,
    "---",
    "",
    `> Exported by the Grok Bot ${role.name} itself (${exported.file}). It was written for Grok Bot; you are the`,
    `> **${role.name}** agent in OpenBot. Your role skills and the team rules win where they disagree.`,
    "> Timed routines listed here are history: hole.fm wakes you when there is work.",
    "",
    exported.rest.trim(),
    "",
  ].join("\n");
}

function source(id: string): string {
  return readFileSync(join(here, "source-skills", `${id}.md`), "utf8").replace(/^---\n[\s\S]*?\n---\n/u, "");
}

function firstLine(text: string): string {
  return (text.match(/^#\s+(.+)$/mu)?.[1] ?? "").trim();
}

function skillFile(id: string, role: Role): string {
  const body = source(id);
  const description =
    `${firstLine(body) || id} (hole.fm skill ${id}, snapshot ${SNAPSHOT}). Use for every ${role.name} task.`
      .replace(/"/gu, "'")
      .slice(0, 900);
  return [
    "---",
    `name: ${id}`,
    `description: "${description}"`,
    "---",
    "",
    `> **HoleA.I OpenBot copy** of the hole.fm skill \`${id}\`, taken ${SNAPSHOT}. It was written for the Grok bot team;`,
    `> you are the **${role.name}** agent in OpenBot, running on Claude. Read "Grok", "the bot" and "you" as you.`,
    "> - `holefm_*`, `marketing_*`, `bridge_*`, `ops_*` and `self_*` tools are on the **hole.fm** MCP server. Same names, same arguments.",
    '> - "Your user-Higgsfield connector" is the **Higgsfield** MCP server (Vincent\'s account).',
    `> - On \`bridge_grok_claim\` pass \`bot\` = \`${role.bot}\`, so the server's wakes and recovery treat your claim as before.`,
    "> - Every owner rule, cap and gate below applies unchanged.",
    `> - The live server copy wins: when a task may depend on a recent change, read \`holefm_skill_read(skill_id="${id}")\` first.`,
    "",
    body.trim(),
    "",
  ].join("\n");
}

function instructions(role: Role): string {
  const wake = role.wake
    ? `hole.fm wakes you through your webhook routine (wake bot "${role.wake}"): the message is JSON with the event and the item ids. Do only those items, then ack each one with ops_update action wake_ack. Do not scan the board.`
    : "Work on what the Chief of Staff or the board gives you.";
  return [
    `You are the HoleA.I ${role.name} agent. ${role.focus}`,
    `Your job is defined by your skills: ${role.skills.map((s) => `"${s}"`).join(", ")} and the team rules "${TEAM_RULES}". Follow them exactly; they hold Vincent's owner rules, caps and gates.`,
    wake,
    `Hand work to another agent in the HoleA.I team channel or through the hole.fm board, never by doing their job. Hand a task back and forth at most 3 times, then ask a human (Vincent or Elle) through the Chief of Staff.`,
    "Never put keys, passwords or tokens in chats, cards or files. Ask before any action a skill marks as an owner call.",
  ]
    .join("\n\n")
    .slice(0, 2000);
}

const files: Record<string, Uint8Array> = {};
const grokExports = readGrokExports();
const addSkill = (path: string, id: string, text: string) => {
  // The check the skill library runs when the import installs the skill.
  const { problem } = readSkillFrontmatter(text, id);
  if (problem) throw new Error(`${path}/SKILL.md: ${problem}`);
  files[`${path}/SKILL.md`] = strToU8(text);
  return path;
};
const agents = ROLES.map((role) => {
  const skillPaths = [...role.skills, TEAM_RULES].map((id) =>
    addSkill(`agents/${role.key}/skills/${id}`, id, skillFile(id, role)),
  );
  const exported = grokExports.get(role.key);
  const memories = [...BASE_MEMORIES, ...(exported?.memories ?? [])];
  if (exported && memories.length > MEMORY_LIMIT) {
    // Past the import's memory limit, the rest is kept in the export skill rather than dropped.
    const overflow = memories.slice(MEMORY_LIMIT).map((m) => `- ${m}`);
    exported.rest += `\n\n## MORE MEMORIES\n\n${overflow.join("\n")}`;
    logger.warn(
      `${role.name}: ${overflow.length} memories past the limit of ${MEMORY_LIMIT} went to its grok-bot-export skill.`,
    );
  }
  if (exported) {
    skillPaths.push(
      addSkill(`agents/${role.key}/skills/grok-bot-export`, "grok-bot-export", exportSkillFile(role, exported)),
    );
  }
  return {
    key: role.key,
    name: role.name,
    title: role.title,
    description: instructions(role),
    avatar: null,
    skills: skillPaths,
    routines: [],
    memories: memories.slice(0, MEMORY_LIMIT),
    files: null,
  };
});

const manifest = {
  format: "openbot-agent-import",
  version: 1,
  source: { app: "holeai-team", exportedAt: new Date().toISOString() },
  agents,
  channels: [
    {
      key: "holeai-team",
      name: "HoleA.I team",
      title: "The whole team; the Chief of Staff leads",
      instructions:
        "The Chief of Staff leads: it routes work, follows up and asks Vincent or Elle for owner calls. Each agent does only its own role and hands the next step to the agent that owns it. At most 3 hand-offs per task, then ask a human.",
      members: ROLES.map((role) => role.key),
      lead: "chief",
      routines: [],
      memories: [],
    },
  ],
};

const json = JSON.stringify(manifest, null, 2);
files["openbot-import.json"] = strToU8(json);
// The same check the app runs when you choose the file, with the default memory limit per agent.
const { manifest: decoded, warnings } = decodeImportManifest(files["openbot-import.json"], MEMORY_LIMIT);
for (const warning of warnings) logger.warn(warning);
if (decoded.agents.length !== agents.length) throw new Error("OpenBot dropped an agent from the manifest.");
const out = join(here, "holeai-team-import.zip");
writeFileSync(out, zipSync(files, { level: 9 }));
logger.info(
  `Wrote ${out}: ${agents.length} agents, ${Object.keys(files).length - 1} skill files, Grok exports for ${
    [...grokExports.keys()].join(", ") || "none"
  }. The manifest passes OpenBot's decoder.`,
);
