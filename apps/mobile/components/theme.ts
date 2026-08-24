export const colors = {
  ink: "#20261F",
  muted: "#778078",
  // Small caption/label text needs >= 4.5:1 against paper/card; `muted` only reaches ~3.6:1.
  mutedStrong: "#5C645C",
  disabled: "#A6ADA5",
  paper: "#F4F1EA",
  card: "#FFFDF8",
  line: "#DFDDD5",
  terracotta: "#D95D3F",
  terracottaSoft: "#F5DED6",
  moss: "#56705F",
  mossSoft: "#DFE8DF",
  yellow: "#E8B653",
  white: "#FFFFFF",
  // Overlays drawn on top of the live camera feed.
  scrimStrong: "rgba(27,34,30,0.78)",
  scrimSoft: "rgba(27,34,30,0.55)",
  scrimFade: "rgba(27,34,30,0.16)",
} as const;

