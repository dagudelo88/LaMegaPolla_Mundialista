import { describe, expect, it } from "vitest";
import { getFlagCdnSlug, getFlagUrl } from "@/lib/teams/flag-url";

describe("flag-url", () => {
  it("maps FIFA codes to flagcdn slugs", () => {
    expect(getFlagCdnSlug("MEX")).toBe("mx");
    expect(getFlagCdnSlug("RSA")).toBe("za");
    expect(getFlagCdnSlug("ENG")).toBe("gb-eng");
    expect(getFlagCdnSlug("SCO")).toBe("gb-sct");
    expect(getFlagCdnSlug("SUI")).toBe("ch");
  });

  it("normalizes unsupported CDN widths", () => {
    expect(getFlagUrl("ARG", 48)).toBe("https://flagcdn.com/w80/ar.png");
    expect(getFlagUrl("MAR", 32)).toBe("https://flagcdn.com/w40/ma.png");
  });
});
