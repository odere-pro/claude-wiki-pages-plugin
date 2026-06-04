import { test, expect, describe } from "bun:test";
import { decide, type FirewallPolicy } from "./firewall.ts";

const base: FirewallPolicy = {
  enabled: true,
  mode: "enforce",
  vault: "/srv/project/vault",
  allowPaths: [],
  denyPaths: ["**/.ssh/**", "**/.aws/**", "**/.env", "**/.git/config"],
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
});
