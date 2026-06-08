import { Link, usePage } from '@inertiajs/react';
import { HardDrive, LayoutGrid, ScrollText, Search, Settings, Shield, Upload } from 'lucide-react';

import AppLogo from '@/components/app-logo';
import { NavFolders } from '@/components/nav-folders';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { dashboard } from '@/routes';
import { index as adminLogsIndex } from '@/routes/admin/logs';
import { index as adminSettingsIndex } from '@/routes/admin/settings';
import { index as adminUsersIndex } from '@/routes/admin/users';
import { index as filesIndex } from '@/routes/files';
import { index as searchIndex } from '@/routes/search';
import { create as uploadCreate } from '@/routes/upload';
import type { NavItem, User } from '@/types';

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
    const { isCurrentUrl } = useCurrentUrl();

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
                <SidebarGroup className="px-2 py-0">
                    <SidebarGroupLabel>Медиафайлы</SidebarGroupLabel>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isCurrentUrl(dashboard())} tooltip={{ children: 'Главная' }}>
                                <Link href={dashboard()} prefetch>
                                    <LayoutGrid />
                                    <span>Главная</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                asChild
                                isActive={isCurrentUrl(filesIndex())}
                                tooltip={{ children: isAdmin ? 'Все файлы' : 'Файлы' }}
                            >
                                <Link href={filesIndex()} prefetch>
                                    <HardDrive />
                                    <span>{isAdmin ? 'Все файлы' : 'Файлы'}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <NavFolders />
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isCurrentUrl(searchIndex())} tooltip={{ children: 'Поиск' }}>
                                <Link href={searchIndex()} prefetch>
                                    <Search />
                                    <span>Поиск</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        {isAdmin && (
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild isActive={isCurrentUrl(uploadCreate())} tooltip={{ children: 'Загрузить' }}>
                                    <Link href={uploadCreate()} prefetch>
                                        <Upload />
                                        <span>Загрузить</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        )}
                    </SidebarMenu>
                </SidebarGroup>
                {isAdmin && <NavMain items={adminNavItems} label="Администрирование" />}
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
