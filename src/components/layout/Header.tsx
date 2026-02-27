import React, { useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Menu, ChevronRight, Home } from 'lucide-react';

interface HeaderProps {
    onMenuClick: () => void;
    user?: {
        id: string;
        displayName: string;
        role: string;
        photoURL?: string;
    };
}

export const Header: React.FC<HeaderProps> = ({
    onMenuClick,
    user
}) => {
    const location = useLocation();

    // Generate Breadcrumbs
    const breadcrumbs = useMemo(() => {
        const pathnames = location.pathname.split('/').filter((x) => x);
        const baseBreadcrumbs: { label: string; path: string; last?: boolean }[] = [
            { label: 'KitapantauPS', path: '/' },
        ];

        const mappedBreadcrumbs = pathnames.map((value, index) => {
            const last = index === pathnames.length - 1;
            const to = `/${pathnames.slice(0, index + 1).join('/')}`;

            // Capitalize and format labels
            let label = value.replace(/-/g, ' ');
            label = label.charAt(0).toUpperCase() + label.slice(1);

            if (label.length > 20 && !last) label = label.substring(0, 17) + '...';

            return { label, path: to, last };
        });

        return [...baseBreadcrumbs, ...mappedBreadcrumbs];
    }, [location.pathname]);

    return (
        <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-border/40 bg-white/70 dark:bg-black/70 backdrop-blur-xl px-4 md:px-6 transition-all duration-300 transform">
            <div className="flex items-center gap-4 flex-1">
                <button
                    className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 md:hidden transition-all active:scale-95"
                    onClick={onMenuClick}
                >
                    <Menu className="h-5 w-5 text-foreground/80" />
                </button>

                {/* Breadcrumbs - Desktop only */}
                <nav className="hidden md:flex items-center gap-2 text-xs font-medium">
                    {breadcrumbs.map((crumb, idx) => (
                        <React.Fragment key={crumb.path}>
                            {idx > 0 && <ChevronRight size={12} className="text-muted-foreground/40" />}
                            {crumb.last ? (
                                <span className="text-foreground font-semibold truncate max-w-[200px]">
                                    {crumb.label}
                                </span>
                            ) : (
                                <Link
                                    to={crumb.path}
                                    className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
                                >
                                    {idx === 0 && <Home size={13} className="mb-0.5" />}
                                    {crumb.label}
                                </Link>
                            )}
                        </React.Fragment>
                    ))}
                </nav>
            </div>

            <div className="flex items-center gap-3">

                {/* User Profile */}
                {user && (
                    <div className="group flex items-center gap-2 pl-1 pr-2 py-1 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-all cursor-pointer active:scale-95">
                        <div className="h-7 w-7 overflow-hidden rounded-full shadow-sm">
                            {user.photoURL ? (
                                <img src={user.photoURL} alt={user.displayName} className="h-full w-full object-cover" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-primary/80 text-[10px] font-bold text-primary-foreground">
                                    {user.displayName.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div className="hidden flex-col items-start leading-none md:flex mr-1">
                            <span className="text-[12px] font-semibold text-foreground">{user.displayName}</span>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
};
