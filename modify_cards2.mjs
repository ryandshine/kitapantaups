import fs from 'fs';

let content = fs.readFileSync('src/pages/AduanDetailPage.tsx', 'utf-8');

// 1. Add subtle green background to all main cards and remove inner nested borders.
content = content.replace(
    /className="([^"]*)rounded-2xl border border-\[\#34A853\]\/30 shadow-sm([^"]*)"/g,
    'className="$1rounded-2xl border border-[#34A853]/30 bg-[#34A853]/[0.04] shadow-sm$2"'
);

// Add subtle green background to Ubah Status Aduan
content = content.replace(
    /className="no-print relative overflow-hidden border border-\[\#34A853\]\/30 bg-white p-5 dark:bg-card sm:rounded-2xl shadow-sm"/g,
    'className="no-print relative overflow-hidden border border-[#34A853]/30 bg-[#34A853]/[0.04] p-5 sm:rounded-2xl shadow-sm"'
);

// 2. Remove redundant nested borders and replace them with green tinted borders or remove entirely
content = content.replace(/border border-border/g, 'border border-[#34A853]/20');
content = content.replace(/border-border\/70/g, 'border-[#34A853]/20');
content = content.replace(/border-border\/80/g, 'border-[#34A853]/20');
content = content.replace(/border-border/g, 'border-[#34A853]/20');

// Remove border from badges in Lokasi Objek to make it cleaner
content = content.replace(
    /className="text-\[10px\] bg-muted text-foreground border-\[\#34A853\]\/20"/g,
    'className="text-[10px] bg-[#34A853]/10 text-[#34A853] border-transparent"'
);

// Clean up background colors inside cards to blend better
content = content.replace(/bg-muted\/30/g, 'bg-transparent');
content = content.replace(/bg-muted\/20/g, 'bg-transparent');
content = content.replace(/bg-muted\/60/g, 'bg-[#34A853]/10');
content = content.replace(/bg-white/g, 'bg-transparent');

// Fix sticky header white background so it doesn't become transparent and unreadable
content = content.replace(
    /bg-transparent\/90/g, // if it was bg-white/90
    'bg-white/95'
);
content = content.replace(/bg-white\/90/g, 'bg-white/95');

// Fix "Ubah status aduan ke PROSES" text
content = content.replace(
    /bg-muted\/40 px-3 py-2 text-\[11px\] font-medium text-muted-foreground/g,
    'bg-[#34A853]/10 px-3 py-2 text-[11px] font-medium text-[#34A853]'
);

// Fix Lokasi Objek inner cards
content = content.replace(
    /className="rounded-xl border border-\[\#34A853\]\/20 bg-transparent p-3"/g,
    'className="rounded-xl border border-[#34A853]/20 bg-[#34A853]/5 p-3"'
);

// Riwayat Penanganan timeline inner cards
content = content.replace(
    /className="group relative flex items-start gap-3 overflow-hidden rounded-xl border border-\[\#34A853\]\/20 bg-transparent p-3.5 shadow-sm"/g,
    'className="group relative flex items-start gap-3 overflow-hidden rounded-xl border border-[#34A853]/20 bg-[#34A853]/5 p-3.5 shadow-sm"'
);

// File urls badges in Riwayat Penanganan
content = content.replace(
    /bg-transparent border-\[\#34A853\]\/20 text-muted-foreground/g,
    'bg-[#34A853]/10 border-transparent text-[#34A853]'
);

fs.writeFileSync('src/pages/AduanDetailPage.tsx', content);
console.log("Applied deep green frames styling.");
