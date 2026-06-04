import { test, expect, describe, afterAll } from "bun:test";
import { join } from "node:path";
import { makeVault, CLEAN_VAULT, type Sandbox } from "../test-helpers/sandbox/vault.ts";

// cli.ts is the entrypoint — it calls process.exit(main()) on import, so it is
// exercised as a subprocess rather than imported. This covers the router and the
// argument parser end-to-end.
const CLI = join(import.meta.dir, "cli.ts");

interface RunResult {
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
}

function run(...args: string[]): RunResult {
  const proc = Bun.spawnSync(["bun", CLI, ...args], { stdout: "pipe", stderr: "pipe" });
  return {
    code: proc.exitCode,
    stdout: proc.stdout.toString(),
    stderr: proc.stderr.toString(),
  };
}

const sandboxes: Sandbox[] = [];
afterAll(() => sandboxes.forEach((s) => s.cleanup()));

describe("usage / help", () => {
  test("prints usage and exits 1 when no command is given", () => {
    const r = run();
    expect(r.code).toBe(1);
    expect(r.stdout).toContain("Usage: claude-wiki-pages");
  });

  test("prints usage and exits 0 for --help", () => {
    const r = run("--help");
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("deterministic LLM-Wiki engine");
  });
});

describe("unknown command", () => {
  test("writes to stderr and exits 2", () => {
    const r = run("bogus");
    expect(r.code).toBe(2);
    expect(r.stderr).toContain("Unknown command 'bogus'");
  });
});

describe("planned (not-yet-implemented) commands", () => {
  test("a planned verb exits 0 with a not-implemented notice", () => {
    const r = run("index");
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("not yet implemented");
  });

  test("--json yields a structured not-implemented payload", () => {
    const r = run("index", "--json");
    expect(r.code).toBe(0);
    const payload = JSON.parse(r.stdout);
    expect(payload.command).toBe("index");
    expect(payload.status).toBe("not-implemented");
  });
});

describe("verify routing", () => {
  test("verify --json on a clean vault returns a parseable report and exit 0", () => {
    const sb = makeVault(CLEAN_VAULT);
    sandboxes.push(sb);
    const r = run("verify", "--target", sb.vault, "--json");
    expect(r.code).toBe(0);
    const report = JSON.parse(r.stdout);
    expect(report.command).toBe("verify");
    expect(report.clean).toBe(true);
  });
});
