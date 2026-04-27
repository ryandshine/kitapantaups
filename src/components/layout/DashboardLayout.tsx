import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';


export const DashboardLayout: React.FC = () => {
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(true);
    const [isHovered, setIsHovered] = useState(false);
    const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768);
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const mediaQuery = window.matchMedia('(min-width: 768px)');

        const syncLayoutMode = (event?: MediaQueryListEvent) => {
            const matches = event?.matches ?? mediaQuery.matches;
            setIsDesktop(matches);
            if (matches) {
                setMobileSidebarOpen(false);
            } else {
                setMobileSidebarOpen(true);
            }
        };

        syncLayoutMode();
        mediaQuery.addEventListener('change', syncLayoutMode);

        return () => {
            mediaQuery.removeEventListener('change', syncLayoutMode);
        };
    }, []);

    useEffect(() => {
        if (isDesktop) {
            document.body.style.removeProperty('overflow');
            return;
        }

        document.body.style.overflow = mobileSidebarOpen ? 'hidden' : '';

        return () => {
            document.body.style.removeProperty('overflow');
        };
    }, [isDesktop, mobileSidebarOpen]);

    const isExpanded = isDesktop ? isHovered : mobileSidebarOpen;

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className={cn(
            "relative flex min-h-dvh overflow-x-clip bg-background"
        )}>
            {/* Background decorative elements - Simplified for Apple look */}
            <div className="absolute inset-0 bg-background pointer-events-none" />

            {/* Hover Trigger Zone (Desktop only) */
            /* ... keep usage of isHovered ... */}
            <div
                className="fixed top-0 left-0 z-[60] h-4 w-4 hidden md:block" // Reduced trigger area
                onMouseEnter={() => {
                    if (isDesktop) setIsHovered(true);
                }}
            />

            <div
                onMouseEnter={() => {
                    if (isDesktop) setIsHovered(true);
                }}
                onMouseLeave={() => {
                    if (isDesktop) setIsHovered(false);
                }}
                className="z-50"
            >
                <Sidebar
                    isOpen={isExpanded}
                    onClose={() => setMobileSidebarOpen(false)}
                    onLogout={handleLogout}
                />
            </div>

            <div className={cn(
                "relative z-10 flex w-full flex-1 flex-col transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
                "md:ml-20",
                isExpanded && "md:ml-64"
            )}>
                <Header
                    onMenuClick={() => setMobileSidebarOpen((prev) => !prev)}
                    user={user ? {
                        id: user.id,
                        email: user.email,
                        displayName: user.displayName,
                        role: user.role,
                    } : undefined}
                />

                <main className="custom-scrollbar flex-1 overflow-x-hidden overflow-y-auto bg-muted/10 min-h-[calc(100dvh-56px)]">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8"
                        >
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
};
