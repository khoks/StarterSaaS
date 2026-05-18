/**
 * EmailSender impls — ConsoleEmailSender + NoopEmailSender.
 */

import { describe, expect, it } from "vitest";

import {
  ConsoleEmailSender,
  NoopEmailSender,
  type RenderedEmail,
} from "../src/index.js";

const SAMPLE: RenderedEmail = {
  to: { email: "alice@acme.test", name: "Alice" },
  subject: "Welcome",
  textBody: "Hello Alice — welcome to Acme.",
  templateId: "welcome",
  tenantId: "01900000-0000-7000-8000-000000000001",
};

describe("ConsoleEmailSender", () => {
  it("default mode logs a single PII-scrubbed summary line", async () => {
    const log: string[] = [];
    const sender = new ConsoleEmailSender({ log: (msg) => log.push(msg) });
    await sender.send(SAMPLE);
    expect(log).toHaveLength(1);
    expect(log[0]).toMatch(/template=welcome/);
    expect(log[0]).toMatch(/to=a\*+@acme\.test/);
    expect(log[0]).not.toContain("alice@acme.test"); // local part masked
  });

  it("verbose mode prints subject + body (dev only)", async () => {
    const log: string[] = [];
    const sender = new ConsoleEmailSender({ log: (msg) => log.push(msg), verbose: true });
    await sender.send(SAMPLE);
    expect(log.length).toBeGreaterThanOrEqual(3);
    expect(log.some((l) => l.includes("Welcome"))).toBe(true);
    expect(log.some((l) => l.includes("Hello Alice"))).toBe(true);
  });

  it("masks recipient even in verbose mode", async () => {
    const log: string[] = [];
    const sender = new ConsoleEmailSender({ log: (msg) => log.push(msg), verbose: true });
    await sender.send(SAMPLE);
    const joined = log.join("\n");
    expect(joined).not.toMatch(/alice@acme\.test/);
  });
});

describe("NoopEmailSender", () => {
  it("captures every send into the `sent` array", async () => {
    const sender = new NoopEmailSender();
    await sender.send(SAMPLE);
    await sender.send({ ...SAMPLE, subject: "Second" });
    expect(sender.sent).toHaveLength(2);
    expect(sender.sent[0]?.subject).toBe("Welcome");
    expect(sender.sent[1]?.subject).toBe("Second");
  });
});
