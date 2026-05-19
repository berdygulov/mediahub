import { Head } from '@inertiajs/react';
import { Users } from 'lucide-react';
import { dashboard } from '@/routes';
import * as adminUsers from '@/routes/admin/users';

export default function AdminUsers() {
    return (
        <>
            <Head title="Администратор — Пользователи" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 lg:p-6">

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Users className="size-5 text-muted-foreground" />
                        <h1 className="text-lg font-semibold">Пользователи</h1>
                    </div>
                </div>

                {/* Users table — TODO: replace with real data */}
                <div className="overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-muted/40">
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Имя</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Роль</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Зарегистрирован</th>
                                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                                    Пользователи не найдены
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}

AdminUsers.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Admin', href: '#' },
        { title: 'Users', href: adminUsers.index() },
    ],
};
