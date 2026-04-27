import React, { useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Menu, ChevronRight, Home } from 'lucide-react';

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
    const location = useLocation();
    const safeDisplayName = user?.displayName?.trim() || user?.email?.split('@')[0] || 'User';
    const safeInitial = safeDisplayName.charAt(0).toUpperCase();

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
        <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-border/60 bg-background/88 px-4 backdrop-blur-xl transition-all duration-300 md:px-6">
            <div className="flex flex-1 items-center gap-3">
                <button
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-card/90 shadow-sm transition-all hover:bg-accent/20 active:scale-95 md:hidden"
                    onClick={onMenuClick}
                >
                    <Menu className="h-4.5 w-4.5 text-foreground/80" />
                </button>

                {/* Breadcrumbs - Desktop only */}
                <nav className="hidden items-center gap-2 text-[0.78rem] font-medium md:flex">
                    {breadcrumbs.map((crumb, idx) => (
                        <React.Fragment key={crumb.path}>
                            {idx > 0 && <ChevronRight size={12} className="text-muted-foreground/40" />}
                            {crumb.last ? (
                                <span className="max-w-[240px] truncate font-semibold text-foreground">
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

            <div className="flex items-center gap-2">
                {/* User Profile */}
                {user && (
                    <div className="group flex cursor-pointer items-center gap-2 rounded-full border border-border/70 bg-card/92 py-1 pl-1 pr-2.5 shadow-sm transition-all hover:border-primary/20 hover:bg-accent/12 active:scale-95">
                        <div className="h-7 w-7 overflow-hidden rounded-full shadow-sm">
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-primary/80 text-[9px] font-bold text-primary-foreground">
                                {safeInitial}
                            </div>
                        </div>
                        <div className="mr-1 hidden flex-col items-start leading-none md:flex">
                            <span className="text-[11px] font-semibold text-foreground">{safeDisplayName}</span>
                            <span className="mt-0.5 rounded-full bg-primary/8 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-primary">{user.role}</span>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
};
