import { Head, Link } from '@inertiajs/react';
import { Film, Music, Upload, HardDrive } from 'lucide-react';
import { dashboard } from '@/routes';
import { index as filesIndex } from '@/routes/files';
import { create as uploadCreate } from '@/routes/upload';

export default function Dashboard() {
    return (
        <>
            <Head title="Главная" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 lg:p-6">
                <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-xl border border-sidebar-border/70 bg-card p-4 dark:border-sidebar-border">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">Все файлы</p>
                            <HardDrive className="size-4 text-muted-foreground" />
                        </div>
                        <p className="mt-2 text-2xl font-semibold">0</p>
                    </div>
                    <Link
                        href={filesIndex({ query: { type: 'video' } }).url}
                        className="rounded-xl border border-sidebar-border/70 bg-card p-4 transition-colors hover:bg-muted/40 dark:border-sidebar-border"
                    >
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">Видео</p>
                            <Film className="size-4 text-muted-foreground" />
                        </div>
                        <p className="mt-2 text-2xl font-semibold">0</p>
                    </Link>
                    <Link
                        href={filesIndex({ query: { type: 'audio' } }).url}
                        className="rounded-xl border border-sidebar-border/70 bg-card p-4 transition-colors hover:bg-muted/40 dark:border-sidebar-border"
                    >
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">Аудио</p>
                            <Music className="size-4 text-muted-foreground" />
                        </div>
                        <p className="mt-2 text-2xl font-semibold">0</p>
                    </Link>
                </div>

                <div className="flex flex-1 flex-col gap-4 rounded-xl border border-sidebar-border/70 p-6 dark:border-sidebar-border">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-medium">Последние загрузки</h2>
                        <Link href={uploadCreate().url} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                            <Upload className="size-3.5" />
                            Загрузить
                        </Link>
                    </div>
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                            <HardDrive className="size-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium">Файлов пока нет</p>
                        <p className="text-xs text-muted-foreground">Загрузите первый файл чтобы начать</p>
                        <Link href={uploadCreate().url} className="mt-1 text-xs text-primary underline underline-offset-4 hover:text-primary/80">
                            Загрузить файл
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Главная',
            href: dashboard(),
        },
    ],
};
