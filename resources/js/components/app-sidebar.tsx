import { Link, usePage } from '@inertiajs/react';
import { LayoutGrid, Upload, Film, Music, Folder, Search, Shield, HardDrive, ScrollText, Settings } from 'lucide-react';
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
import { index as adminLogsIndex } from '@/routes/admin/logs';
import { index as adminSettingsIndex } from '@/routes/admin/settings';
import { index as adminUsersIndex } from '@/routes/admin/users';
import { index as filesIndex } from '@/routes/files';
import { index as foldersIndex } from '@/routes/folders';
import { index as searchIndex } from '@/routes/search';
import { create as uploadCreate } from '@/routes/upload';
import type { User } from '@/types';
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Главная',
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'Мои файлы',
        href: filesIndex(),
        icon: HardDrive,
    },
    {
        title: 'Мои папки',
        href: foldersIndex(),
        icon: Folder,
    },
    {
        title: 'Поиск',
        href: searchIndex(),
        icon: Search,
    },
    {
        title: 'Загрузить',
        href: uploadCreate(),
        icon: Upload,
    },
];

const adminNavItems: NavItem[] = [
    {
        title: 'Пользователи',
        href: adminUsersIndex(),
        icon: Shield,
    },
    {
        title: 'Журнал',
        href: adminLogsIndex(),
        icon: ScrollText,
    },
    {
        title: 'Настройки',
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
                <NavMain items={mainNavItems} label="Мой контекст"/>
                {isAdmin && <NavMain items={adminNavItems} label="Администратор" />}
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
