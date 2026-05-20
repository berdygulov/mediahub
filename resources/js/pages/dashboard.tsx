import { Head, Link, usePage } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import { Film, HardDrive, Music, Upload } from 'lucide-react';

import { formatBytes } from '@/lib/utils';
import type { User } from '@/types';
import { dashboard } from '@/routes';
import { index as filesIndex, show as filesShow } from '@/routes/files';
import { create as uploadCreate } from '@/routes/upload';

interface FileRecord {
    id: number;
    name: string;
    type: 'video' | 'audio';
    size: number;
    mime_type: string;
    created_at: string;
}

interface Stats {
    total: number;
    video: number;
    audio: number;
    storage: number;
}

interface Props {
    stats: Stats;
    recentFiles: FileRecord[];
}

export default function Dashboard({ stats, recentFiles }: Props) {
    const { auth } = usePage().props;
    const isAdmin = (auth as { user: User }).user?.is_admin;

    return (
        <>
            <Head title="Главная" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 lg:p-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Link
                        href={filesIndex().url}
                        className="rounded-xl border border-sidebar-border/70 bg-card p-4 transition-colors hover:bg-muted/40 dark:border-sidebar-border"
                    >
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">{isAdmin ? 'Все файлы' : 'Мои файлы'}</p>
                            <HardDrive className="size-4 text-muted-foreground" />
                        </div>
                        <p className="mt-2 text-2xl font-semibold">{stats.total}</p>
                    </Link>

                    <Link
                        href={filesIndex({ query: { type: 'video' } }).url}
                        className="rounded-xl border border-sidebar-border/70 bg-card p-4 transition-colors hover:bg-muted/40 dark:border-sidebar-border"
                    >
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">Видео</p>
                            <Film className="size-4 text-blue-500" />
                        </div>
                        <p className="mt-2 text-2xl font-semibold">{stats.video}</p>
                    </Link>

                    <Link
                        href={filesIndex({ query: { type: 'audio' } }).url}
                        className="rounded-xl border border-sidebar-border/70 bg-card p-4 transition-colors hover:bg-muted/40 dark:border-sidebar-border"
                    >
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">Аудио</p>
                            <Music className="size-4 text-purple-500" />
                        </div>
                        <p className="mt-2 text-2xl font-semibold">{stats.audio}</p>
                    </Link>

                    <div className="rounded-xl border border-sidebar-border/70 bg-card p-4 dark:border-sidebar-border">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">Занято места</p>
                            <HardDrive className="size-4 text-muted-foreground" />
                        </div>
                        <p className="mt-2 text-2xl font-semibold">{formatBytes(stats.storage)}</p>
                    </div>
                </div>

                <div className="flex flex-1 flex-col gap-4 rounded-xl border border-sidebar-border/70 p-6 dark:border-sidebar-border">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-medium">Последние загрузки</h2>
                        <Link
                            href={uploadCreate().url}
                            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                        >
                            <Upload className="size-3.5" />
                            Загрузить
                        </Link>
                    </div>

                    {recentFiles.length === 0 ? (
                        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                                <HardDrive className="size-5 text-muted-foreground" />
                            </div>
                            <p className="text-sm font-medium">Файлов пока нет</p>
                            <p className="text-xs text-muted-foreground">Загрузите первый файл чтобы начать</p>
                            <Link
                                href={uploadCreate().url}
                                className="mt-1 text-xs text-primary underline underline-offset-4 hover:text-primary/80"
                            >
                                Загрузить файл
                            </Link>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {recentFiles.map((file) => (
                                <Link
                                    key={file.id}
                                    href={filesShow(file.id).url}
                                    className="flex items-center gap-3 py-3 transition-colors hover:text-foreground first:pt-0 last:pb-0"
                                >
                                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                                        {file.type === 'video' ? (
                                            <Film className="size-4 text-blue-500" />
                                        ) : (
                                            <Music className="size-4 text-purple-500" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium">{file.name}</p>
                                        <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                                    </div>
                                    <span className="shrink-0 text-xs text-muted-foreground">
                                        {format(parseISO(file.created_at), 'dd.MM.yyyy')}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    )}
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
