import React from 'react';
import { Menu } from 'lucide-react';

interface HeaderProps {
    onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({
    onMenuClick
}) => {
    return (
        <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-border bg-background/92 px-4 backdrop-blur-md transition-all duration-300 md:px-6">
            <div className="flex items-center gap-3">
                <button
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card transition-colors hover:bg-accent active:scale-95 md:hidden"
                    onClick={onMenuClick}
                >
                    <Menu className="h-4.5 w-4.5 text-foreground/80" />
                </button>
            </div>
        </header>
    );
};
