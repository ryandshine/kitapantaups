export const ADUAN_CARD_THEMES = [
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

export const getAduanCardTheme = (_index: number) =>
  ADUAN_CARD_THEMES[0];

export const getAduanStatusDotClass = (_status?: string) => {
  return "bg-primary";
};

export const getPriorityBadgeClass = (priority?: string) => {
  const normalized = (priority || "").toLowerCase();
  if (normalized === "tinggi") return "status-soft-red";
  if (normalized === "sedang") return "status-soft-yellow";
  return "status-soft-blue";
};
