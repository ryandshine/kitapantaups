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
                        className="fixed inset-0 z-[45] bg-black/60 backdrop-blur-sm md:hidden"
                        onClick={onClose}
                    />
                )}
            </AnimatePresence>

            <aside className={cn(
                "fixed top-0 left-0 z-50 h-full border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] md:shadow-none",
                !isOpen ? "-translate-x-full md:translate-x-0 md:w-[4.75rem]" : "translate-x-0 w-[min(17rem,calc(100vw-1rem))] md:w-60",
            )}>
                {/* Logo Section */}
                <div className={cn(
                    "flex h-14 items-center border-b border-sidebar-border/70 px-4",
                    !isOpen && "px-0 justify-center"
                )}>
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sidebar-border bg-sidebar-accent text-sidebar-foreground">
                            <span className="text-base font-bold">K</span>
                        </div>
                        {isOpen && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex flex-col"
                            >
                                <span className="whitespace-nowrap text-[0.95rem] font-semibold tracking-tight text-sidebar-foreground">KitapantauPS</span>
                                <span className="text-[0.62rem] font-medium uppercase tracking-[0.18em] text-sidebar-foreground/60">Direktorat PPS • V1.0</span>
                            </motion.div>
                        )}
                    </div>
                    {isOpen && (
                        <button
                            className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-sidebar-accent md:hidden"
                            onClick={onClose}
                        >
                            <X className="h-4 w-4 text-sidebar-foreground/70" />
                        </button>
                    )}
                </div>

                {/* Navigation Section */}
                <div className="custom-scrollbar flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
                    {menuGroups.map((group, idx) => {
                        const visibleItems = group.items.filter(item => !item.adminOnly || isAdmin);
                        if (visibleItems.length === 0) return null;

                        return (
                            <div key={idx} className="flex flex-col gap-1">
                                {isOpen && (
                                    <p className="mb-1 px-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/45">
                                        {group.title}
                                    </p>
                                )}
                                <div className="space-y-1">
                                    {visibleItems.map((item) => (
                                        <NavLink
                                            key={item.path}
                                            to={item.path}
                                            className={({ isActive }) => cn(
                                                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.92rem] font-medium transition-all duration-200",
                                                !isOpen && "justify-center px-0",
                                                isActive
                                                    ? "bg-sidebar-accent text-sidebar-foreground ring-1 ring-white/8"
                                                    : "text-sidebar-foreground/78 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground"
                                            )}
                                        >
                                            {({ isActive }) => (
                                                <>
                                                    <item.icon className={cn(
                                                        "h-[1.1rem] w-[1.1rem] shrink-0 transition-transform duration-300",
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
                <div className="mt-auto border-t border-sidebar-border bg-sidebar p-3">
                    <button
                        onClick={onLogout}
                        className={cn(
                            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[0.92rem] font-medium text-red-200 transition-all hover:bg-sidebar-accent hover:text-sidebar-foreground active:scale-95",
                            !isOpen && "justify-center px-0"
                        )}
                    >
                        <LogOut className="h-[1.1rem] w-[1.1rem] shrink-0" />
                        {isOpen && <span className="truncate">Logout</span>}
                    </button>

                </div>
            </aside>
        </>
    );
};
