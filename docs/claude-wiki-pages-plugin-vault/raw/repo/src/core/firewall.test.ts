import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, symlinkSync, rmSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { decide, type FirewallPolicy } from "./firewall.ts";

const base: FirewallPolicy = {
  enabled: true,
  mode: "enforce",
  vault: "/srv/project/vault",
  allowPaths: [],
  denyPaths: ["**/.ssh/**", "**/.aws/**", "**/.env", "**/.git/config"],
  otherVaults: [],
};

describe("firewall decide", () => {
  test("allows writes inside the vault", () => {
    const d = decide("/srv/project/vault/wiki/x.md", base);
    expect(d.allowed).toBe(true);
    expect(d.matchedRule).toBe("vault");
  });

  test("blocks writes outside the vault under enforce", () => {
    const d = decide("/srv/other/secret.md", base);
    expect(d.allowed).toBe(false);
    expect(d.matchedRule).toBe("outside-vault");
  });

  test("deny globs win even inside the vault", () => {
    const d = decide("/srv/project/vault/.env", base);
    expect(d.allowed).toBe(false);
    expect(d.matchedRule).toBe("deny:**/.env");
  });

  test("allowPaths extends the boundary", () => {
    const d = decide("/mnt/shared/notes.md", { ...base, allowPaths: ["/mnt/shared"] });
    expect(d.allowed).toBe(true);
    expect(d.matchedRule).toBe("allow:/mnt/shared");
  });

  test("warn mode advises but never blocks", () => {
    const d = decide("/srv/other/secret.md", { ...base, mode: "warn" });
    expect(d.allowed).toBe(true);
    expect(d.matchedRule).toBe("outside-vault");
    expect(d.mode).toBe("warn");
  });

  test("off / disabled is a pass-through", () => {
    expect(decide("/anywhere", { ...base, mode: "off" }).allowed).toBe(true);
    expect(decide("/anywhere", { ...base, enabled: false }).allowed).toBe(true);
  });

  test("a path containing the vault name but outside it is blocked", () => {
    const d = decide("/srv/project/vault-backup/x.md", base);
    expect(d.allowed).toBe(false);
    expect(d.matchedRule).toBe("outside-vault");
  });

  test("warn mode + deny-glob match: advises but does not block, rule is the deny", () => {
    const d = decide("/srv/project/vault/.env", { ...base, mode: "warn" });
    expect(d.allowed).toBe(true);
    expect(d.matchedRule).toBe("deny:**/.env");
    expect(d.mode).toBe("warn");
  });
});

describe("firewall decide — symlink escape (F1)", () => {
  let root: string;
  let activeVault: string;
  let sibling: string;

  beforeEach(() => {
    // mkdtemp + realpath so the test base is itself physical (macOS /tmp is a
    // symlink to /private/tmp; without this the vault root and resolved target
    // would live in different namespaces).
    root = realpathSync(mkdtempSync(join(tmpdir(), "fw-symlink-")));
    activeVault = join(root, "A");
    sibling = join(root, "B");
    mkdirSync(join(activeVault, "wiki"), { recursive: true });
    mkdirSync(join(sibling, "wiki"), { recursive: true });
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  const policy = (): FirewallPolicy => ({
    ...base,
    vault: activeVault,
    otherVaults: [sibling],
  });

  test("dir symlink inside active vault pointing at sibling — write is cross-vault, not vault", () => {
    // A/wiki/link-to-B -> B ; writing A/wiki/link-to-B/wiki/x.md lands in B.
    symlinkSync(sibling, join(activeVault, "wiki", "link-to-B"));
    const d = decide(join(activeVault, "wiki", "link-to-B", "wiki", "x.md"), policy());
    expect(d.allowed).toBe(false);
    expect(d.matchedRule).toBe("cross-vault");
  });

  test("leaf symlink inside active vault pointing at a sibling file — write is cross-vault", () => {
    // A/wiki/x.md -> B/wiki/x.md (target need not exist yet).
    symlinkSync(join(sibling, "wiki", "x.md"), join(activeVault, "wiki", "x.md"));
    const d = decide(join(activeVault, "wiki", "x.md"), policy());
    expect(d.allowed).toBe(false);
    expect(d.matchedRule).toBe("cross-vault");
  });

  test("dir symlink to an unregistered location outside all vaults — outside-vault", () => {
    const outside = join(root, "C");
    mkdirSync(outside, { recursive: true });
    symlinkSync(outside, join(activeVault, "wiki", "link-to-C"));
    const d = decide(join(activeVault, "wiki", "link-to-C", "x.md"), policy());
    expect(d.allowed).toBe(false);
    expect(d.matchedRule).toBe("outside-vault");
  });

  test("deny glob still fires on the physical location reached through a symlink", () => {
    symlinkSync(sibling, join(activeVault, "wiki", "link-to-B"));
    const d = decide(join(activeVault, "wiki", "link-to-B", ".env"), policy());
    expect(d.allowed).toBe(false);
    expect(d.matchedRule).toBe("deny:**/.env");
  });

  test("a real (non-symlinked) write inside the active vault is still allowed", () => {
    const d = decide(join(activeVault, "wiki", "real.md"), policy());
    expect(d.allowed).toBe(true);
    expect(d.matchedRule).toBe("vault");
  });

  test("symlink escape under warn mode advises but does not block", () => {
    symlinkSync(sibling, join(activeVault, "wiki", "link-to-B"));
    const d = decide(join(activeVault, "wiki", "link-to-B", "wiki", "x.md"), {
      ...policy(),
      mode: "warn",
    });
    expect(d.allowed).toBe(true);
    expect(d.matchedRule).toBe("cross-vault");
  });
});

describe("firewall decide — cross-vault confinement (S3)", () => {
  const sibling = "/srv/project/sibling-vault";
  const withSibling: FirewallPolicy = {
    ...base,
    otherVaults: [sibling],
  };

  test("write to active vault is allowed (vault rule)", () => {
    const d = decide("/srv/project/vault/wiki/page.md", withSibling);
    expect(d.allowed).toBe(true);
    expect(d.matchedRule).toBe("vault");
  });

  test("write to sibling registered vault is blocked under enforce", () => {
    const d = decide(`${sibling}/wiki/page.md`, withSibling);
    expect(d.allowed).toBe(false);
    expect(d.matchedRule).toBe("cross-vault");
  });

  test("deny glob inside sibling still returns deny (deny wins over cross-vault)", () => {
    const d = decide(`${sibling}/.env`, withSibling);
    expect(d.allowed).toBe(false);
    expect(d.matchedRule).toBe("deny:**/.env");
  });

  test("allowPaths cannot override cross-vault block", () => {
    const policy: FirewallPolicy = {
      ...withSibling,
      allowPaths: [sibling],
    };
    const d = decide(`${sibling}/secret.md`, policy);
    expect(d.allowed).toBe(false);
    expect(d.matchedRule).toBe("cross-vault");
  });

  test("path traversal active/../sibling canonicalizes and is blocked", () => {
    // /srv/project/vault/../sibling-vault/secret.md resolves to sibling
    const d = decide("/srv/project/vault/../sibling-vault/secret.md", withSibling);
    expect(d.allowed).toBe(false);
    expect(d.matchedRule).toBe("cross-vault");
  });

  test("outside-all paths produce outside-vault, not cross-vault", () => {
    const d = decide("/etc/passwd", withSibling);
    expect(d.allowed).toBe(false);
    expect(d.matchedRule).toBe("outside-vault");
  });

  test("warn mode advises but does not block sibling write", () => {
    const policy: FirewallPolicy = { ...withSibling, mode: "warn" };
    const d = decide(`${sibling}/page.md`, policy);
    expect(d.allowed).toBe(true);
    expect(d.matchedRule).toBe("cross-vault");
    expect(d.mode).toBe("warn");
  });

  test("no other vaults registered — behaves as original (outside-vault for non-vault paths)", () => {
    const d = decide("/srv/other/file.md", base);
    expect(d.allowed).toBe(false);
    expect(d.matchedRule).toBe("outside-vault");
  });
});
