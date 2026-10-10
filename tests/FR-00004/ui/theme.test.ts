// FR-00004: the Content Studio theme uses the POC's colours, and every text
// and background pair it declares meets WCAG AA contrast for normal text
// (4.5 to 1).
import { describe, expect, it } from "vitest";
import { CONTRAST_PAIRS, POC_COLORS, theme } from "../../../apps/studio-web/src/app/theme";

function luminance(hex: string): number {
  const value = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16) / 255);
  const channel = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channel(r ?? 0) + 0.7152 * channel(g ?? 0) + 0.0722 * channel(b ?? 0);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

describe("FR-00004: theme", () => {
  it("FR-00004: the theme uses the POC's gold as its primary colour", () => {
    expect(theme.primaryColor).toBe("gold");
    expect(theme.colors?.gold).toContain(POC_COLORS.gold);
    expect(theme.colors?.gold).toHaveLength(10);
  });

  it("FR-00004: every declared text and background pair meets WCAG AA contrast for normal text", () => {
    expect(CONTRAST_PAIRS.length).toBeGreaterThan(3);
    for (const pair of CONTRAST_PAIRS) {
      expect(contrast(pair.text, pair.background), pair.name).toBeGreaterThanOrEqual(4.5);
    }
  });
});
