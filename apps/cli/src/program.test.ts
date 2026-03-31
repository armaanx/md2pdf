import { describe, expect, it } from "vitest";
import { buildProgram } from "./index";

describe("md2pdf CLI", () => {
  it("registers the major top-level commands", () => {
    const program = buildProgram();
    const commandNames = program.commands.map((command) => command.name());

    expect(commandNames).toContain("render");
    expect(commandNames).toContain("preview");
    expect(commandNames).toContain("validate");
    expect(commandNames).toContain("studio");
    expect(commandNames).toContain("init");
    expect(commandNames).toContain("assets");
    expect(commandNames).toContain("themes");
    expect(commandNames).toContain("setup");
  });
});
