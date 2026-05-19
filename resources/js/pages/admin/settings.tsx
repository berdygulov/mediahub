import { Head } from '@inertiajs/react';
import { Settings } from 'lucide-react';
import { dashboard } from '@/routes';
import * as adminSettings from '@/routes/admin/settings';

export default function AdminSettings() {
    return (
        <>
            <Head title="Администратор — Настройки" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 lg:p-6">

                <div className="flex items-center gap-2">
                    <Settings className="size-5 text-muted-foreground" />
                    <h1 className="text-lg font-semibold">Системные настройки</h1>
                </div>

                {/* Settings form — TODO: wire up real settings */}
                <div className="flex max-w-lg flex-col gap-6 rounded-xl border border-sidebar-border/70 p-6 dark:border-sidebar-border">

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium">Макс. размер загрузки (МБ)</label>
                        <input
                            type="number"
                            defaultValue={512}
                            className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                            disabled
                        />
                        <p className="text-xs text-muted-foreground">Максимальный размер одного файла</p>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium">Таймаут сессии (минуты)</label>
                        <input
                            type="number"
                            defaultValue={30}
                            className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                            disabled
                        />
                        <p className="text-xs text-muted-foreground">Время бездействия до автовыхода</p>
                    </div>

                    <button
                        disabled
                        className="w-fit rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground opacity-50"
                    >
                        Сохранить настройки
                    </button>
                </div>
            </div>
        </>
    );
}

AdminSettings.layout = {
    breadcrumbs: [
        { title: 'Главная', href: dashboard() },
        { title: 'Администратор', href: '#' },
        { title: 'Настройки', href: adminSettings.index() },
    ],
};
