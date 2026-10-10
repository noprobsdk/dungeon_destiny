// FR-00004: Content Studio's Mantine theme, in the POC Content Studio's
// colours (a design reference, not copied code): gold accents, parchment
// backgrounds, and a dark side menu. Buttons and links use a darker gold so
// white and parchment text pairs meet WCAG AA contrast; a test checks every
// pair in CONTRAST_PAIRS.
import { createTheme } from "@mantine/core";
import type { MantineColorsTuple } from "@mantine/core";

export const POC_COLORS = {
  ink: "#16140f",
  paper: "#f4f0e7",
  panel: "#fffdf8",
  line: "#ddd5c5",
  night: "#181712",
  nightSoft: "#26231b",
  nightText: "#f5efe1",
  gold: "#c68a2d",
  goldBright: "#e6ad4c",
  green: "#33735a",
  purple: "#72509b",
  red: "#9e453d",
} as const;

// The POC's muted text (#787163) is too faint on parchment; this is darker.
export const MUTED = "#6b6457";

// Light to dark; index 5 is the POC gold, index 7 is used for buttons and links.
const gold: MantineColorsTuple = [
  "#f9f3ea",
  "#f2e5d1",
  "#e9d3af",
  "#e0bf8c",
  "#d4a762",
  POC_COLORS.gold,
  "#a27125",
  "#855c1e",
  "#6d4c19",
  "#533a13",
];

const BUTTON_GOLD = gold[7];

export const theme = createTheme({
  primaryColor: "gold",
  primaryShade: 7,
  colors: { gold },
  fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
  defaultRadius: "sm",
  black: POC_COLORS.ink,
  white: POC_COLORS.panel,
});

// Every text and background pair the pages use.
export const CONTRAST_PAIRS = [
  { name: "text on page", text: POC_COLORS.ink, background: POC_COLORS.paper },
  { name: "text on panel", text: POC_COLORS.ink, background: POC_COLORS.panel },
  { name: "muted text on page", text: MUTED, background: POC_COLORS.paper },
  { name: "muted text on panel", text: MUTED, background: POC_COLORS.panel },
  { name: "button text on gold", text: "#ffffff", background: BUTTON_GOLD },
  { name: "link on page", text: BUTTON_GOLD, background: POC_COLORS.paper },
  { name: "link on panel", text: BUTTON_GOLD, background: POC_COLORS.panel },
  { name: "menu text on night", text: POC_COLORS.nightText, background: POC_COLORS.night },
  { name: "active menu text on night", text: POC_COLORS.goldBright, background: POC_COLORS.night },
  { name: "error text on panel", text: POC_COLORS.red, background: POC_COLORS.panel },
  { name: "active status on panel", text: POC_COLORS.green, background: POC_COLORS.panel },
] as const;
