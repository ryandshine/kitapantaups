import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';


export const DashboardLayout: React.FC = () => {
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
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

    const isExpanded = isDesktop || mobileSidebarOpen;

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className={cn("flex min-h-dvh overflow-x-clip bg-background text-foreground")}>
            <div className="z-50">
                <Sidebar
                    isOpen={isExpanded}
                    onClose={() => setMobileSidebarOpen(false)}
                    onLogout={handleLogout}
                />
            </div>

            <div className={cn(
                "flex w-full flex-1 flex-col transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
                "md:ml-60"
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

                <main className="custom-scrollbar min-h-[calc(100dvh-56px)] flex-1 overflow-x-hidden overflow-y-auto">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="mx-auto w-full max-w-[1440px] px-4 py-4 md:px-6 md:py-6 lg:px-8"
                        >
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
};
