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
  {
    bg: "bg-[#EA4335]",
    border: "border-[#EA4335]",
    text: "text-white",
    muted: "text-white/80",
    badge: "bg-white/20 text-white border-white/30",
    iconBg: "bg-white/20 group-hover:bg-white group-hover:text-[#EA4335]",
    iconText: "text-white/70 group-hover:text-[#EA4335]",
  },
  {
    bg: "bg-[#FBBC05]",
    border: "border-[#FBBC05]",
    text: "text-[#202124]",
    muted: "text-[#202124]/80",
    badge: "bg-[#202124]/10 text-[#202124] border-[#202124]/20",
    iconBg: "bg-[#202124]/10 group-hover:bg-[#202124] group-hover:text-[#FBBC05]",
    iconText: "text-[#202124]/70 group-hover:text-[#FBBC05]",
  },
  {
    bg: "bg-[#34A853]",
    border: "border-[#34A853]",
    text: "text-white",
    muted: "text-white/80",
    badge: "bg-white/20 text-white border-white/30",
    iconBg: "bg-white/20 group-hover:bg-white group-hover:text-[#34A853]",
    iconText: "text-white/70 group-hover:text-[#34A853]",
  },
] as const;

export const getGoogleCardTheme = (index: number) =>
  GOOGLE_CARD_THEMES[index % GOOGLE_CARD_THEMES.length];

export const getGoogleStatusDotClass = (status?: string) => {
  const normalized = (status || "").toLowerCase();
  if (normalized === "selesai") return "bg-secondary";
  if (normalized === "ditolak") return "bg-destructive";
  if (["proses", "evaluasi", "monitor", "puldasi"].includes(normalized)) return "bg-primary";
  return "bg-[#FBBC05]";
};

export const getGooglePriorityBadgeClass = (priority?: string) => {
  const normalized = (priority || "").toLowerCase();
  if (normalized === "tinggi") return "google-soft-red";
  if (normalized === "sedang") return "google-soft-yellow";
  return "google-soft-blue";
};
