import React from 'react';
import { Menu } from 'lucide-react';

interface HeaderProps {
    onMenuClick: () => void;
    user?: {
        id: string;
        email?: string;
        displayName?: string;
        role: string;
    };
}

export const Header: React.FC<HeaderProps> = ({
    onMenuClick,
    user
}) => {
    const safeDisplayName = user?.displayName?.trim() || user?.email?.split('@')[0] || 'User';
    const safeInitial = safeDisplayName.charAt(0).toUpperCase();

    return (
        <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-border bg-background/92 px-4 backdrop-blur-md transition-all duration-300 md:px-6">
            <div className="flex flex-1 items-center gap-3">
                    <button
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card transition-colors hover:bg-accent active:scale-95 md:hidden"
                    onClick={onMenuClick}
                >
                    <Menu className="h-4.5 w-4.5 text-foreground/80" />
                </button>

            </div>

            <div className="flex items-center gap-2">
                {/* User Profile */}
                {user && (
                    <div className="group flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-card py-1 pl-1 pr-2.5 transition-colors hover:border-primary/30 hover:bg-accent active:scale-95">
                        <div className="h-7 w-7 overflow-hidden rounded-full shadow-sm">
                            <div className="flex h-full w-full items-center justify-center bg-primary text-[9px] font-bold text-primary-foreground">
                                {safeInitial}
                            </div>
                        </div>
                        <div className="mr-1 hidden flex-col items-start leading-none md:flex">
                            <span className="text-[11px] font-semibold text-foreground">{safeDisplayName}</span>
                            {safeDisplayName.toLowerCase() !== user.role.toLowerCase() && (
                                <span className="mt-0.5 rounded-full bg-primary/8 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-primary">{user.role}</span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
};
