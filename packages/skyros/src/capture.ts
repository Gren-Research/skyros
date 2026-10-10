import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  truncateSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";
import { skyrosHome } from "./home.ts";
import { type RedactionCounts, redactJsonLine, totalRedactions } from "./redact.ts";

/**
 * Capture (RFC 0001 → Write path, step 1): copies a Claude Code session transcript, and its
 * subagents' transcripts, into the agent's raw log, redacting secrets on the way.
 *
 * Layout: `<home>/agents/<agent>/log/YYYY/MM/DD-<session>.jsonl`, dated by the session's
 * first timestamp in UTC so the path never changes between runs. Subagents go in
 * `DD-<session>/subagents/`. Line N of a log is line N of its transcript, so capture is
 * append-only and idempotent: running it again appends only lines added since.
 */

export interface CaptureOptions {
  transcriptPath: string;
  /** Defaults to the transcript's file name, which is how Claude Code names sessions. */
  sessionId?: string;
  agent?: string;
  home?: string;
}

export interface CaptureResult {
  /** The session's main log file, or undefined if the transcript has nothing to capture yet. */
  logPath?: string;
  /** Lines appended by this run, across the main log and subagent logs. */
  appended: number;
  redactions: number;
  /** Logs left untouched because they no longer match their transcript. */
  conflicts: string[];
}

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const SAFE_FILE = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}\.jsonl$/;

export function captureSession(options: CaptureOptions): CaptureResult {
  const { transcriptPath, agent = "developer", home = skyrosHome() } = options;
  const sessionId = options.sessionId ?? basename(transcriptPath, ".jsonl");
  if (!SAFE_ID.test(sessionId))
    throw new Error(`Not a valid session id: ${JSON.stringify(sessionId)}`);
  if (!SAFE_ID.test(agent)) throw new Error(`Not a valid agent name: ${JSON.stringify(agent)}`);

  const lines = completeLines(readFileSync(transcriptPath, "utf8"));
  const started = firstTimestamp(lines);
  const result: CaptureResult = { appended: 0, redactions: 0, conflicts: [] };
  if (!started) return result;

  const iso = started.toISOString(); // YYYY-MM-DDTHH:mm:ss.sssZ
  const base = join(
    home,
    "agents",
    agent,
    "log",
    iso.slice(0, 4),
    iso.slice(5, 7),
    `${iso.slice(8, 10)}-${sessionId}`,
  );
  result.logPath = `${base}.jsonl`;

  const record = (target: string, outcome: MirrorOutcome) => {
    if (outcome === "conflict") {
      result.conflicts.push(target);
      return;
    }
    result.appended += outcome.appended;
    result.redactions += totalRedactions(outcome.counts);
  };
  record(result.logPath, mirror(lines, result.logPath));

  const subagents = join(dirname(transcriptPath), sessionId, "subagents");
  if (existsSync(subagents)) {
    for (const name of readdirSync(subagents)
      .filter((n) => SAFE_FILE.test(n))
      .sort()) {
      const target = join(base, "subagents", name);
      record(target, mirror(completeLines(readFileSync(join(subagents, name), "utf8")), target));
    }
  }
  return result;
}

type MirrorOutcome = { appended: number; counts: RedactionCounts } | "conflict";

// The log holds every prompt, file and command output, so only its owner may read it.
const PRIVATE_DIR = 0o700;
const PRIVATE_FILE = 0o600;

/** Brings `target` up to date with the source lines, appending only what's new. */
function mirror(source: string[], target: string): MirrorOutcome {
  let logged: string[] = [];
  let partialFrom: number | undefined;
  if (existsSync(target)) {
    const text = readFileSync(target, "utf8");
    logged = completeLines(text);
    const complete = text.lastIndexOf("\n") + 1;
    if (complete < text.length) partialFrom = Buffer.byteLength(text.slice(0, complete));
  }

  const last = logged.length - 1;
  if (logged.length > source.length || (last >= 0 && !sameLine(logged[last], source[last]))) {
    return "conflict";
  }
  // A run that died mid-write leaves a partial last line: drop it and write it again.
  if (partialFrom !== undefined) truncateSync(target, partialFrom);

  const counts: RedactionCounts = {};
  const fresh = source.slice(logged.length).map((line) => {
    const redacted = redactJsonLine(line);
    for (const [kind, n] of Object.entries(redacted.counts)) counts[kind] = (counts[kind] ?? 0) + n;
    return `${redacted.text}\n`;
  });
  if (fresh.length === 0) return { appended: 0, counts };

  mkdirSync(dirname(target), { recursive: true, mode: PRIVATE_DIR });
  if (logged.length === 0) {
    // New log: write it whole, then rename, so a crash never leaves half a file behind.
    writeFileSync(`${target}.partial`, fresh.join(""), { mode: PRIVATE_FILE });
    renameSync(`${target}.partial`, target);
  } else {
    appendFileSync(target, fresh.join(""), { mode: PRIVATE_FILE });
  }
  return { appended: fresh.length, counts };
}

/** A log line matches its source line if it's the redacted source, or has the same uuid. */
function sameLine(logged: string | undefined, source: string | undefined): boolean {
  if (logged === undefined || source === undefined) return false;
  if (redactJsonLine(source).text === logged) return true;
  const a = uuidOf(logged);
  return a !== undefined && a === uuidOf(source);
}

function uuidOf(line: string): string | undefined {
  try {
    const value: unknown = JSON.parse(line);
    if (value !== null && typeof value === "object" && "uuid" in value) {
      return typeof value.uuid === "string" ? value.uuid : undefined;
    }
  } catch {
    // Not JSON: no uuid.
  }
  return undefined;
}

/** The complete lines of a JSONL file. A last line without "\n" may still be being written. */
function completeLines(text: string): string[] {
  const end = text.lastIndexOf("\n");
  return end < 0 ? [] : text.slice(0, end).split("\n");
}

function firstTimestamp(lines: string[]): Date | undefined {
  for (const line of lines) {
    if (!line.includes('"timestamp"')) continue;
    try {
      const value: unknown = JSON.parse(line);
      if (value !== null && typeof value === "object" && "timestamp" in value) {
        const date = new Date(String(value.timestamp));
        if (!Number.isNaN(date.getTime())) return date;
      }
    } catch {
      // Skip lines that aren't valid JSON.
    }
  }
  return undefined;
}
