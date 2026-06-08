import { Head, Link, router, usePage } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import { Download, Eye, Film, Folder, FolderInput, HardDrive, Music, Play, Trash2, Upload } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
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
}

interface Props {
    stats: Stats;
    recentFiles: FileRecord[];
}

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

    return (
        <>
            <Head title="Главная" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 lg:p-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Link
                        href={filesRoute.index().url}
                        className="rounded-xl border border-sidebar-border/70 bg-card p-4 transition-colors hover:bg-muted/40 dark:border-sidebar-border"
                    >
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">{isAdmin ? 'Все файлы' : 'Мои файлы'}</p>
                            <HardDrive className="size-4 text-muted-foreground" />
                        </div>
                        <p className="mt-2 text-2xl font-semibold">{stats.total}</p>
                    </Link>

                    <Link
                        href={filesRoute.index({ query: { type: 'video' } }).url}
                        className="rounded-xl border border-sidebar-border/70 bg-card p-4 transition-colors hover:bg-muted/40 dark:border-sidebar-border"
                    >
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">Видео</p>
                            <Film className="size-4 text-blue-500" />
                        </div>
                        <p className="mt-2 text-2xl font-semibold">{stats.video}</p>
                    </Link>

                    <Link
                        href={filesRoute.index({ query: { type: 'audio' } }).url}
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
                                <div
                                    key={file.id}
                                    className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                                >
                                    <div
                                        className="flex flex-1 cursor-pointer items-center gap-3 transition-colors hover:text-foreground min-w-0"
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
                                        <span className="shrink-0 text-xs text-muted-foreground">
                                            {format(parseISO(file.created_at), 'dd.MM.yyyy')}
                                        </span>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
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
                                        <Link href={filesRoute.show(file.id).url}>
                                            <Button variant="ghost" size="icon" className="size-7" title="Просмотр">
                                                <Eye className="size-3.5" />
                                            </Button>
                                        </Link>
                                        <a href={filesRoute.download(file.id).url}>
                                            <Button variant="ghost" size="icon" className="size-7" title="Скачать">
                                                <Download className="size-3.5" />
                                            </Button>
                                        </a>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-7"
                                            title="Переместить в папку"
                                            onClick={() => setFileToMove(file)}
                                        >
                                            <FolderInput className="size-3.5" />
                                        </Button>
                                        {isAdmin && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:text-destructive size-7"
                                                title="Удалить"
                                                onClick={() => setFileToDelete(file)}
                                            >
                                                <Trash2 className="size-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
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

                        <div className="my-1 border-t" />

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
