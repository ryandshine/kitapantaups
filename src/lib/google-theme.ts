export const GOOGLE_CARD_THEMES = [
  {
    bg: "bg-[#4285F4]",
    border: "border-[#4285F4]",
    text: "text-white",
    muted: "text-white/80",
    badge: "bg-white/20 text-white border-white/30",
    iconBg: "bg-white/20 group-hover:bg-white group-hover:text-[#4285F4]",
    iconText: "text-white/70 group-hover:text-[#4285F4]",
  },
] as const;

export const getGoogleCardTheme = (_index: number) =>
  GOOGLE_CARD_THEMES[0];

export const getGoogleStatusDotClass = (_status?: string) => {
  return "bg-[#34A853]";
};

export const getGooglePriorityBadgeClass = (priority?: string) => {
  const normalized = (priority || "").toLowerCase();
  if (normalized === "tinggi") return "google-soft-red";
  if (normalized === "sedang") return "google-soft-yellow";
  return "google-soft-blue";
};
