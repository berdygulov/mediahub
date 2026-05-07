import { Link, usePage } from '@inertiajs/react';
import { LayoutGrid, Upload, Film, Music, Folder, Search, Shield, HardDrive, ScrollText, Settings } from 'lucide-react';
import type { User } from '@/types';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import { index as filesIndex } from '@/routes/files';
import { index as foldersIndex } from '@/routes/folders';
import { create as uploadCreate } from '@/routes/upload';
import { index as searchIndex } from '@/routes/search';
import { index as adminUsersIndex } from '@/routes/admin/users';
import { index as adminLogsIndex } from '@/routes/admin/logs';
import { index as adminSettingsIndex } from '@/routes/admin/settings';
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'All Files',
        href: filesIndex(),
        icon: HardDrive,
    },
    {
        title: 'Videos',
        href: filesIndex({ query: { type: 'video' } }),
        icon: Film,
    },
    {
        title: 'Audio',
        href: filesIndex({ query: { type: 'audio' } }),
        icon: Music,
    },
    {
        title: 'Folders',
        href: foldersIndex(),
        icon: Folder,
    },
    {
        title: 'Search',
        href: searchIndex(),
        icon: Search,
    },
    {
        title: 'Upload',
        href: uploadCreate(),
        icon: Upload,
    },
];

const adminNavItems: NavItem[] = [
    {
        title: 'Users',
        href: adminUsersIndex(),
        icon: Shield,
    },
    {
        title: 'Logs',
        href: adminLogsIndex(),
        icon: ScrollText,
    },
    {
        title: 'Settings',
        href: adminSettingsIndex(),
        icon: Settings,
    },
];

export function AppSidebar() {
    const { auth } = usePage().props;
    const isAdmin = (auth as { user: User }).user?.is_admin;

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
                {isAdmin && <NavMain items={adminNavItems} label="Admin" />}
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
