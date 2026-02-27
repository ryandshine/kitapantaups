import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';


export const DashboardLayout: React.FC = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Auto-close sidebar on mobile when navigating
    React.useEffect(() => {
        if (window.innerWidth < 768) {
            setSidebarOpen(false);
        }
    }, [location.pathname]);

    // On mobile, we only care about sidebarOpen
    // On desktop, we care about sidebarOpen OR hover
    const isExpanded = window.innerWidth >= 768 ? (sidebarOpen || isHovered) : sidebarOpen;

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className={cn(
            "flex min-h-screen bg-background relative"
        )}>
            {/* Background decorative elements - Simplified for Apple look */}
            <div className="absolute inset-0 bg-background pointer-events-none" />

            {/* Hover Trigger Zone (Desktop only) */
            /* ... keep usage of isHovered ... */}
            <div
                className="fixed top-0 left-0 z-[60] h-4 w-4 hidden md:block" // Reduced trigger area
                onMouseEnter={() => {
                    if (window.innerWidth >= 768) setIsHovered(true);
                }}
            />

            <div
                onMouseEnter={() => {
                    if (window.innerWidth >= 768) setIsHovered(true);
                }}
                onMouseLeave={() => {
                    if (window.innerWidth >= 768) setIsHovered(false);
                }}
                className="z-50"
            >
                <Sidebar
                    isOpen={isExpanded}
                    onClose={() => setSidebarOpen(false)}
                    onLogout={handleLogout}
                />
            </div>

            <div className={cn(
                "flex-1 flex flex-col transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] w-full relative z-10",
                "md:ml-20",
                isExpanded && "md:ml-64"
            )}>
                <Header
                    onMenuClick={() => setSidebarOpen(!sidebarOpen)}
                    user={user ? {
                        id: user.id,
                        displayName: user.displayName,
                        role: user.role,
                        photoURL: user.photoURL,
                    } : undefined}
                />

                <main className="flex-1 h-[calc(100vh-56px)] overflow-y-auto custom-scrollbar bg-muted/10">
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
