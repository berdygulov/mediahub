import { Head, Link, router, usePage } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import { Download, Eye, Film, Folder, FolderInput, HardDrive, Music, Play, Trash2, Upload } from 'lucide-react';
import * as React from 'react';
import { Pie, PieChart } from 'recharts';

import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { buildTree, FlatFolder, FolderNodeItem, getAncestorIds } from '@/components/folder-node-item';
import { useMediaPlayer } from '@/contexts/media-player-context';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatBytes } from '@/lib/utils';
import type { User } from '@/types';
import { dashboard } from '@/routes';
import * as filesRoute from '@/routes/files';
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
    disk_total: number;
    disk_free: number;
}

interface Props {
    stats: Stats;
    recentFiles: FileRecord[];
}

const fileTypeChartConfig = {
    count: { label: 'Файлов' },
    video: { label: 'Видео', color: 'var(--color-blue-500)' },
    audio: { label: 'Аудио', color: 'var(--color-purple-500)' },
} satisfies ChartConfig;

export default function Dashboard({ stats, recentFiles }: Props) {
    const { auth } = usePage().props;
    const isAdmin = (auth as { user: User }).user?.is_admin;
    const { play } = useMediaPlayer();

    const [fileToDelete, setFileToDelete] = React.useState<FileRecord | null>(null);
    const [isDeleting, setIsDeleting] = React.useState(false);

    const [fileToMove, setFileToMove] = React.useState<FileRecord | null>(null);
    const [foldersList, setFoldersList] = React.useState<FlatFolder[]>([]);
    const [foldersLoading, setFoldersLoading] = React.useState(false);
    const [selectedFolderId, setSelectedFolderId] = React.useState<number | null>(null);
    const [isMoving, setIsMoving] = React.useState(false);

    React.useEffect(() => {
        if (!fileToMove) {
            return;
        }

        setSelectedFolderId(null);
        setFoldersList([]);
        setFoldersLoading(true);

        const controller = new AbortController();

        fetch(filesRoute.folders(fileToMove.id).url, {
            credentials: 'same-origin',
            headers: { Accept: 'application/json' },
            signal: controller.signal,
        })
            .then((r) => r.json())
            .then((data: FlatFolder[]) => {
                setFoldersList(data);
                setFoldersLoading(false);
            })
            .catch((err: unknown) => {
                if ((err as { name?: string }).name !== 'AbortError') {
                    setFoldersLoading(false);
                }
            });

        return () => controller.abort();
    }, [fileToMove]);

    function handleDelete() {
        if (!fileToDelete) {
            return;
        }

        setIsDeleting(true);
        router.delete(filesRoute.destroy(fileToDelete.id).url, {
            preserveScroll: true,
            onFinish: () => {
                setIsDeleting(false);
                setFileToDelete(null);
            },
        });
    }

    function handleMoveFolder() {
        if (!fileToMove) {
            return;
        }

        setIsMoving(true);
        router.patch(
            filesRoute.moveFolder(fileToMove.id).url,
            { folder_id: selectedFolderId },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => setFileToMove(null),
                onFinish: () => setIsMoving(false),
            },
        );
    }

    const folderTree = React.useMemo(() => buildTree(foldersList), [foldersList]);
    const ancestorIds = React.useMemo(
        () => getAncestorIds(foldersList, null),
        [foldersList],
    );

    const diskUsedPct = stats.disk_total > 0
        ? Math.min((stats.disk_total - stats.disk_free) / stats.disk_total * 100, 100)
        : 0;
    const diskBarColor = diskUsedPct >= 90 ? 'bg-destructive' : diskUsedPct >= 75 ? 'bg-chart-1' : 'bg-primary';

    const [diskBarWidth, setDiskBarWidth] = React.useState(0);
    React.useEffect(() => {
        const id = window.setTimeout(() => setDiskBarWidth(diskUsedPct), 400);
        return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <>
            <Head title="Главная" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 lg:p-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 [&>*]:min-w-0">
                    <Card className="relative gap-2 py-4 transition-colors hover:bg-muted/40">
                        <CardHeader className="px-4">
                            <CardDescription>{isAdmin ? 'Все файлы' : 'Доступные файлы'}</CardDescription>
                            <CardAction><HardDrive className="size-4 text-muted-foreground" /></CardAction>
                        </CardHeader>
                        <CardContent className="px-4">
                            <p className="text-2xl font-semibold">{stats.total}</p>
                        </CardContent>
                        <Link href={filesRoute.index().url} className="absolute inset-0 rounded-xl" />
                    </Card>

                    <Card className="relative gap-2 py-4 transition-colors hover:bg-muted/40">
                        <CardHeader className="px-4">
                            <CardDescription>Видео</CardDescription>
                            <CardAction><Film className="size-4 text-blue-500" /></CardAction>
                        </CardHeader>
                        <CardContent className="px-4">
                            <p className="text-2xl font-semibold">{stats.video}</p>
                        </CardContent>
                        <Link href={filesRoute.index({ query: { type: 'video' } }).url} className="absolute inset-0 rounded-xl" />
                    </Card>

                    <Card className="relative gap-2 py-4 transition-colors hover:bg-muted/40">
                        <CardHeader className="px-4">
                            <CardDescription>Аудио</CardDescription>
                            <CardAction><Music className="size-4 text-purple-500" /></CardAction>
                        </CardHeader>
                        <CardContent className="px-4">
                            <p className="text-2xl font-semibold">{stats.audio}</p>
                        </CardContent>
                        <Link href={filesRoute.index({ query: { type: 'audio' } }).url} className="absolute inset-0 rounded-xl" />
                    </Card>

                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    <div className="flex min-w-0 flex-col gap-4 overflow-hidden">
                        <Card className="gap-2 py-4">
                            <CardHeader className="px-4">
                                <CardDescription>Диск</CardDescription>
                                <CardAction>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium">{formatBytes(stats.disk_total)}</span>
                                        <HardDrive className="size-4 text-muted-foreground" />
                                    </div>
                                </CardAction>
                            </CardHeader>
                            <CardContent className="px-4">
                                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                    <div
                                        className={cn('h-full rounded-full', diskBarColor)}
                                        style={{ width: `${diskBarWidth.toFixed(1)}%`, transition: 'width 1500ms ease' }}
                                    />
                                </div>
                                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                                    <span>{formatBytes(stats.disk_total - stats.disk_free)} занято</span>
                                    <span>{formatBytes(stats.disk_free)} свободно</span>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="flex flex-col">
                            <CardHeader className="items-center pb-0">
                                <CardTitle>Типы файлов</CardTitle>
                                <CardDescription>{stats.total} файлов всего</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 overflow-hidden pb-0">
                                {stats.total === 0 ? (
                                    <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
                                        Нет данных
                                    </div>
                                ) : (
                                    <ChartContainer config={fileTypeChartConfig} className="mx-auto aspect-square w-full max-h-[250px]">
                                        <PieChart>
                                            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                                            <Pie
                                                data={[
                                                    { type: 'video', count: stats.video, fill: 'var(--color-video)' },
                                                    { type: 'audio', count: stats.audio, fill: 'var(--color-audio)' },
                                                ].filter((d) => d.count > 0)}
                                                dataKey="count"
                                                nameKey="type"
                                            />
                                        </PieChart>
                                    </ChartContainer>
                                )}
                            </CardContent>
                            <CardFooter className="flex-col gap-2 text-sm">
                                <div className="flex items-center gap-2 font-medium leading-none">
                                    <Film className="size-4 text-blue-500" />
                                    Видео — {stats.video}
                                </div>
                                <div className="flex items-center gap-2 leading-none text-muted-foreground">
                                    <Music className="size-4 text-purple-500" />
                                    Аудио — {stats.audio}
                                </div>
                            </CardFooter>
                        </Card>
                    </div>


                    <div className="min-w-0 overflow-hidden lg:col-span-2">
                        <Card className="flex h-full flex-col">
                            <CardHeader>
                                <CardTitle className="text-sm font-medium">
                                    {isAdmin ? 'Последние загрузки' : 'Последние файлы'}
                                </CardTitle>
                                {isAdmin && (
                                    <CardAction>
                                        <Button size="sm" asChild>
                                            <Link href={uploadCreate().url}>
                                                <Upload className="size-3.5" />
                                                Загрузить
                                            </Link>
                                        </Button>
                                    </CardAction>
                                )}
                            </CardHeader>
                            <CardContent className="flex flex-1 flex-col">
                                {recentFiles.length === 0 ? (
                                    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                                        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                                            <HardDrive className="size-5 text-muted-foreground" />
                                        </div>
                                        {isAdmin ? (
                                            <>
                                                <p className="text-sm font-medium">Файлов пока нет</p>
                                                <p className="text-xs text-muted-foreground">Загрузите первый файл чтобы начать</p>
                                                <Button variant="link" size="sm" className="mt-1 h-auto p-0 text-xs" asChild>
                                                    <Link href={uploadCreate().url}>Загрузить файл</Link>
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <p className="text-sm font-medium">Нет доступных файлов</p>
                                                <p className="text-xs text-muted-foreground">Вам пока не предоставлен доступ к файлам</p>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <div className="divide-y">
                                        {recentFiles.map((file) => (
                                            <div
                                                key={file.id}
                                                className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-3"
                                            >
                                                <div
                                                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 transition-colors hover:text-foreground"
                                                    onClick={() => router.visit(filesRoute.show(file.id).url)}
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
                                                    <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                                                        {format(parseISO(file.created_at), 'dd.MM.yyyy')}
                                                    </span>
                                                </div>
                                                <div
                                                    className="flex items-center justify-between sm:justify-end"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <span className="text-xs text-muted-foreground sm:hidden">
                                                        {format(parseISO(file.created_at), 'dd.MM.yyyy')}
                                                    </span>
                                                    <div className="flex items-center gap-0.5">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-7"
                                                            title="Воспроизвести"
                                                            onClick={() =>
                                                                play({
                                                                    id: file.id,
                                                                    name: file.name,
                                                                    type: file.type,
                                                                    mime_type: file.mime_type,
                                                                    size: file.size,
                                                                    created_at: file.created_at,
                                                                    folder: null,
                                                                    streamUrl: filesRoute.stream(file.id).url,
                                                                })
                                                            }
                                                        >
                                                            <Play className="size-3.5" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="size-7" title="Просмотр" asChild>
                                                            <Link href={filesRoute.show(file.id).url}>
                                                                <Eye className="size-3.5" />
                                                            </Link>
                                                        </Button>
                                                        {isAdmin && (
                                                            <>
                                                                <Button variant="ghost" size="icon" className="size-7" title="Скачать" asChild>
                                                                    <a href={filesRoute.download(file.id).url}>
                                                                        <Download className="size-3.5" />
                                                                    </a>
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="size-7"
                                                                    title="Переместить в папку"
                                                                    onClick={() => setFileToMove(file)}
                                                                >
                                                                    <FolderInput className="size-3.5" />
                                                                </Button>
                                                            </>
                                                        )}
                                                        {isAdmin && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="size-7 text-destructive hover:text-destructive"
                                                                title="Удалить"
                                                                onClick={() => setFileToDelete(file)}
                                                            >
                                                                <Trash2 className="size-3.5" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Delete confirmation dialog */}
            <Dialog open={!!fileToDelete} onOpenChange={(open) => !open && setFileToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Удалить файл</DialogTitle>
                        <DialogDescription>
                            Вы уверены, что хотите удалить{' '}
                            <span className="text-foreground font-medium">{fileToDelete?.name}</span>?
                            Это действие необратимо.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setFileToDelete(null)}
                            disabled={isDeleting}
                        >
                            Отмена
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting ? 'Удаление…' : 'Удалить'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Move to folder dialog */}
            <Dialog open={!!fileToMove} onOpenChange={(open) => !open && setFileToMove(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Переместить в папку</DialogTitle>
                        <DialogDescription>
                            Выберите папку для{' '}
                            <span className="text-foreground font-medium">{fileToMove?.name}</span>.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-1">
                        <button
                            type="button"
                            className={cn(
                                'flex items-center gap-1.5 rounded px-2 py-1.5 text-sm transition-colors hover:bg-accent',
                                selectedFolderId === null && 'bg-accent font-medium',
                            )}
                            onClick={() => setSelectedFolderId(null)}
                        >
                            <Folder className="size-3.5 shrink-0 text-muted-foreground" />
                            Без папки
                        </button>

                        <Separator className="my-1" />

                        <div className="max-h-64 overflow-y-auto">
                            {foldersLoading ? (
                                <div className="flex flex-col gap-1 px-2">
                                    {[1, 2, 3].map((i) => (
                                        <Skeleton key={i} className="h-7 w-full rounded" />
                                    ))}
                                </div>
                            ) : folderTree.length === 0 ? (
                                <p className="text-muted-foreground px-2 py-3 text-center text-sm">
                                    Папок пока нет
                                </p>
                            ) : (
                                folderTree.map((node) => (
                                    <FolderNodeItem
                                        key={node.id}
                                        node={node}
                                        selectedId={selectedFolderId}
                                        onSelect={setSelectedFolderId}
                                        openIds={ancestorIds}
                                    />
                                ))
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setFileToMove(null)}
                            disabled={isMoving}
                        >
                            Отмена
                        </Button>
                        <Button onClick={handleMoveFolder} disabled={isMoving}>
                            {isMoving ? 'Перемещение…' : 'Переместить'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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
