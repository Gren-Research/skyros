import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { skyrosHome } from "../src/home.ts";

describe("skyrosHome", () => {
  it("defaults to ~/.skyros", () => {
    expect(skyrosHome({})).toBe(join(homedir(), ".skyros"));
  });

  it("uses SKYROS_HOME when it is set", () => {
    const dir = resolve("memory-test-home");
    expect(skyrosHome({ SKYROS_HOME: dir })).toBe(dir);
  });

  it("makes a relative SKYROS_HOME absolute", () => {
    expect(skyrosHome({ SKYROS_HOME: "relative/home" })).toBe(resolve("relative/home"));
  });

  it("ignores a blank SKYROS_HOME", () => {
    expect(skyrosHome({ SKYROS_HOME: "  " })).toBe(join(homedir(), ".skyros"));
  });
});
