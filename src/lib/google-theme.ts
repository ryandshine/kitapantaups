export const GOOGLE_CARD_THEMES = [
  {
    bg: "bg-card",
    border: "border-border",
    text: "text-foreground",
    muted: "text-muted-foreground",
    badge: "border border-border bg-muted text-foreground",
    iconBg: "bg-muted text-muted-foreground group-hover:bg-accent group-hover:text-foreground",
    iconText: "text-muted-foreground group-hover:text-foreground",
  },
] as const;

export const getGoogleCardTheme = (_index: number) =>
  GOOGLE_CARD_THEMES[0];

export const getGoogleStatusDotClass = (_status?: string) => {
  return "bg-primary";
};

export const getGooglePriorityBadgeClass = (priority?: string) => {
  const normalized = (priority || "").toLowerCase();
  if (normalized === "tinggi") return "google-soft-red";
  if (normalized === "sedang") return "google-soft-yellow";
  return "google-soft-blue";
};
