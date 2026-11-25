import { describe, expect, it } from "bun:test";
import { isAppUrl } from "../electron/origin";

describe("isAppUrl()", () => {
  it("accepts app://trick-or-read/", () => expect(isAppUrl("app://trick-or-read/")).toBe(true));
  it("accepts app://trick-or-read/?x", () => expect(isAppUrl("app://trick-or-read/?x=1")).toBe(true));

  it("rejects app://evil/", () => expect(isAppUrl("app://evil/")).toBe(false));
  it("rejects http://trick-or-read/", () => expect(isAppUrl("http://trick-or-read/")).toBe(false));
  it("rejects https://example.com", () => expect(isAppUrl("https://example.com")).toBe(false));
  it("rejects app://trick-or-read.evil/", () => expect(isAppUrl("app://trick-or-read.evil/")).toBe(false));
  it("rejects empty string", () => expect(isAppUrl("")).toBe(false));
  it("rejects garbage", () => expect(isAppUrl("not a url at all !!!")).toBe(false));
});
