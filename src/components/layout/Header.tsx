import React from 'react';
import { Menu } from 'lucide-react';

interface HeaderProps {
    onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({
    onMenuClick
}) => {
    return (
        <button
            className="fixed top-3 left-3 z-40 flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-card/90 text-foreground shadow-lg backdrop-blur-md transition-colors hover:bg-accent active:scale-95 md:hidden"
            onClick={onMenuClick}
            aria-label="Buka menu navigasi"
        >
            <Menu className="h-4.5 w-4.5 text-foreground/80" />
        </button>
    );
};
