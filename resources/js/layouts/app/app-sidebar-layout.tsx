import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { MediaPlayerPanel } from '@/components/media-player-panel';
import { useMediaPlayer } from '@/contexts/media-player-context';
import type { AppLayoutProps } from '@/types';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    const { isOpen } = useMediaPlayer();

    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent
                variant="sidebar"
                className="overflow-x-hidden"
                style={{ paddingBottom: isOpen ? 'var(--media-player-height, 0px)' : undefined }}
            >
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                {children}
                <MediaPlayerPanel />
            </AppContent>
        </AppShell>
    );
}
