import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    BarChart3,
    FileText,
    LogOut,
    Settings,
    LayoutDashboard,
    Users,
    X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    onLogout: () => void;
}

const menuGroups = [
    {
        title: 'Utama',
        items: [
            { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
        ]
    },
    {
        title: 'Layanan Aduan',
        items: [
            { path: '/pengaduan', icon: FileText, label: 'Daftar Aduan' },
            { path: '/laporan', icon: BarChart3, label: 'Laporan' },
        ]
    },
    {
        title: 'Sistem',
        items: [
            { path: '/users', icon: Users, label: 'Manajemen User', adminOnly: true },
            { path: '/pengaturan', icon: Settings, label: 'Pengaturan' },
        ]
    }
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onLogout }) => {
    const { isAdmin } = useAuth();

    return (
        <>
            {/* Mobile overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[45] bg-background/60 backdrop-blur-sm md:hidden"
                        onClick={onClose}
                    />
                )}
            </AnimatePresence>

            <aside className={cn(
                "fixed top-0 left-0 z-50 h-full border-r border-border/40 bg-white/80 dark:bg-black/80 backdrop-blur-xl transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
                !isOpen ? "-translate-x-full md:translate-x-0 md:w-20" : "translate-x-0 w-64",
            )}>
                {/* Logo Section */}
                <div className={cn(
                    "flex h-16 items-center border-b border-border/40 px-6",
                    !isOpen && "px-0 justify-center"
                )}>
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20">
                            <span className="font-bold text-lg">K</span>
                        </div>
                        {isOpen && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex flex-col"
                            >
                                <span className="text-sm font-semibold tracking-tight text-foreground whitespace-nowrap">KitapantauPS</span>
                                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide opacity-80">Direktorat PPS • V1.0</span>
                            </motion.div>
                        )}
                    </div>
                    {isOpen && (
                        <button
                            className="ml-auto flex h-7 w-7 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 md:hidden transition-colors"
                            onClick={onClose}
                        >
                            <X className="h-4 w-4 text-muted-foreground" />
                        </button>
                    )}
                </div>

                {/* Navigation Section */}
                <div className="flex-1 flex flex-col gap-6 p-4 overflow-y-auto custom-scrollbar">
                    {menuGroups.map((group, idx) => {
                        const visibleItems = group.items.filter(item => !item.adminOnly || isAdmin);
                        if (visibleItems.length === 0) return null;

                        return (
                            <div key={idx} className="flex flex-col gap-1">
                                {isOpen && (
                                    <p className="text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-widest px-3 mb-2">
                                        {group.title}
                                    </p>
                                )}
                                <div className="space-y-1">
                                    {visibleItems.map((item) => (
                                        <NavLink
                                            key={item.path}
                                            to={item.path}
                                            className={({ isActive }) => cn(
                                                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                                                !isOpen && "justify-center px-0",
                                                isActive
                                                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                                                    : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10 hover:text-foreground"
                                            )}
                                        >
                                            {({ isActive }) => (
                                                <>
                                                    <item.icon className={cn(
                                                        "h-5 w-5 shrink-0 transition-transform duration-300",
                                                        !isOpen && "mx-auto",
                                                        isActive ? "scale-105" : "group-hover:scale-110"
                                                    )} />

                                                    {isOpen && (
                                                        <motion.span
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            className="flex-1 truncate"
                                                        >
                                                            {item.label}
                                                        </motion.span>
                                                    )}
                                                </>
                                            )}
                                        </NavLink>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Bottom Section */}
                <div className="p-4 mt-auto border-t border-border/40 bg-black/5 dark:bg-white/5 backdrop-blur-sm">
                    <button
                        onClick={onLogout}
                        className={cn(
                            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive transition-all hover:bg-destructive/10 hover:text-destructive active:scale-95",
                            !isOpen && "justify-center px-0"
                        )}
                    >
                        <LogOut className="h-5 w-5 shrink-0" />
                        {isOpen && <span className="truncate">Keluar Sistem</span>}
                    </button>

                </div>
            </aside>
        </>
    );
};
