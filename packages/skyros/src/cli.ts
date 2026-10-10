#!/usr/bin/env node
// The skyros command line. Claude Code runs `skyros hook <event>` with the event as JSON on stdin.
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { type CaptureResult, captureSession } from "./capture.ts";
import { claudeSettingsPath, installHook } from "./claude-code.ts";
import { skyrosHome } from "./home.ts";

const USAGE = `usage:
  skyros capture <transcript.jsonl>    copy one Claude Code session into memory
  skyros install claude-code [--yes]   capture every Claude Code session from now on
  skyros hook session-end              run by Claude Code when a session ends`;

async function main([command, arg, ...rest]: string[]): Promise<number> {
  if (command === "hook" && arg === "session-end") {
    const event: unknown = JSON.parse(await readStdin());
    if (
      event === null ||
      typeof event !== "object" ||
      !("transcript_path" in event) ||
      typeof event.transcript_path !== "string"
    ) {
      throw new Error("SessionEnd hook input has no transcript_path");
    }
    const sessionId =
      "session_id" in event && typeof event.session_id === "string" ? event.session_id : undefined;
    return report(captureSession({ transcriptPath: event.transcript_path, sessionId }));
  }
  if (command === "capture" && arg) return report(captureSession({ transcriptPath: arg }));
  if (command === "install" && arg === "claude-code") return install(rest.includes("--yes"));
  console.error(USAGE);
  return 2;
}

function report(result: CaptureResult): number {
  if (result.logPath) {
    console.log(
      `Captured ${result.appended} new line(s) into ${result.logPath}` +
        (result.redactions ? `, ${result.redactions} secret(s) redacted.` : "."),
    );
  } else {
    console.log("Nothing to capture yet: the session has no messages.");
  }
  for (const path of result.conflicts) {
    console.error(`Left ${path} untouched: it no longer matches its transcript.`);
  }
  return result.conflicts.length ? 1 : 0;
}

async function install(confirmed: boolean): Promise<number> {
  const cli = fileURLToPath(new URL("./cli.ts", import.meta.url)).replaceAll("\\", "/");
  const command = `node "${cli}" hook session-end`;
  const settings = claudeSettingsPath();
  console.log(`This adds a SessionEnd hook to ${settings}:\n  ${command}`);
  console.log(`Every Claude Code session will then be copied into ${skyrosHome()} when it ends.`);
  if (!confirmed) {
    if (!process.stdin.isTTY) {
      console.error("Not a terminal: run again with --yes to confirm.");
      return 1;
    }
    const prompt = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await prompt.question("Add it? [y/N] ");
    prompt.close();
    if (!/^y(es)?$/i.test(answer.trim())) return 1;
  }
  const outcome = installHook(settings, "SessionEnd", command);
  console.log(outcome === "installed" ? "Installed." : "Already installed; nothing changed.");
  return 0;
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

main(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  },
);
