import { describe, expect, it } from "bun:test";
import { CSP } from "../server/app";

describe("public/_headers (the hosted web version's static pages)", () => {
  it("carries exactly the same Content-Security-Policy as the server and the desktop app", async () => {
    const text = await Bun.file("public/_headers").text();
    const line = text.split("\n").find((l) => l.trim().startsWith("Content-Security-Policy:"));
    expect(line?.trim().slice("Content-Security-Policy:".length).trim()).toBe(CSP);
  });
  it("applies to every path and sets the other security headers", async () => {
    const text = await Bun.file("public/_headers").text();
    expect(text.startsWith("/*\n")).toBe(true);
    for (const h of ["X-Content-Type-Options: nosniff", "Referrer-Policy: no-referrer", "Permissions-Policy: camera=(self), microphone=(self)"]) expect(text).toContain(h);
  });
});
