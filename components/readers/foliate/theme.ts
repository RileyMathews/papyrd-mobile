export type FoliateReaderTheme = {
  background: string;
  foreground: string;
  strongForeground: string;
  mutedForeground: string;
  subtleForeground: string;
  primary: string;
  primaryMuted: string;
  disabledForeground: string;
  controlBackground: string;
  panelBackground: string;
  subtlePanelBackground: string;
  sheetBackground: string;
  sheetShadow: string;
  backdropBackground: string;
  lightboxBackground: string;
  border: string;
  subtleBorder: string;
  sheetBorder: string;
  lightboxBorder: string;
  colorScheme: "light" | "dark";
  overrideColor: boolean;
  backgroundTextureId: string;
};

export const FOLIATE_READER_THEME = {
  background: "#000000",
  foreground: "#ffffff",
  strongForeground: "#f8fafc",
  mutedForeground: "#cbd5e1",
  subtleForeground: "#94a3b8",
  primary: "#7dd3fc",
  primaryMuted: "#bae6fd",
  disabledForeground: "#475569",
  controlBackground: "#020617",
  panelBackground: "rgba(15, 23, 42, 0.88)",
  subtlePanelBackground: "rgba(2, 6, 23, 0.32)",
  sheetBackground: "rgba(2, 6, 23, 0.96)",
  sheetShadow: "rgba(2, 6, 23, 0.48)",
  backdropBackground: "rgba(2, 6, 23, 0.18)",
  lightboxBackground: "rgba(2, 6, 23, 0.94)",
  border: "rgba(148, 163, 184, 0.2)",
  subtleBorder: "rgba(148, 163, 184, 0.14)",
  sheetBorder: "rgba(148, 163, 184, 0.18)",
  lightboxBorder: "rgba(148, 163, 184, 0.24)",
  colorScheme: "dark",
  overrideColor: true,
  backgroundTextureId: "none",
} as const satisfies FoliateReaderTheme;
