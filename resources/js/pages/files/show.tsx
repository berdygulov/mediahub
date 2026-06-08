import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Download, Pencil, Trash2 } from 'lucide-react';
import * as React from 'react';

import { AudioPlayer } from '@/components/players/audio-player';
import { VideoPlayer } from '@/components/players/video-player';
import { Comment, CommentsSection } from '@/components/comments-section';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { formatBytes } from '@/lib/utils';
import { dashboard } from '@/routes';
import * as filesRoute from '@/routes/files';

interface FileFolder {
    id: number;
    name: string;
}

interface FileOwner {
    id: number;
    name: string;
}

interface FileRecord {
    id: number;
    name: string;
    description: string | null;
    mime_type: string;
    type: 'video' | 'audio';
    size: number;
    folder: FileFolder | null;
    user: FileOwner;
    created_at: string;
    comments: Comment[];
}

interface Props {
    file: FileRecord;
    streamUrl: string;
    downloadUrl: string;
    canDownload: boolean;
}

export default function FilesShow({ file, streamUrl, downloadUrl, canDownload }: Props) {
    const { auth } = usePage().props;
    const isAdmin = auth.user.is_admin;

    const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);

    const [showEditDialog, setShowEditDialog] = React.useState(false);
    const { data, setData, patch, processing, errors, clearErrors, reset } = useForm({
        name: file.name,
        description: file.description ?? '',
    });

    function openEditDialog() {
        clearErrors();
        reset();
        setData({ name: file.name, description: file.description ?? '' });
        setShowEditDialog(true);
    }

    function handleEdit(e: React.FormEvent) {
        e.preventDefault();
        patch(filesRoute.update(file.id).url, {
            preserveScroll: true,
            onSuccess: () => setShowEditDialog(false),
        });
    }

    function handleDelete() {
        setIsDeleting(true);
        router.delete(filesRoute.destroy(file.id).url, {
            onFinish: () => {
                setIsDeleting(false);
                setShowDeleteDialog(false);
            },
        });
    }

    return (
        <>
            <Head title={file.name} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 lg:p-6">
                <Link
                    href={filesRoute.index().url}
                    className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1.5 text-sm"
                >
                    <ArrowLeft className="size-3.5" />
                    Назад к файлам
                </Link>

                <div className="border-sidebar-border/70 dark:border-sidebar-border grid grid-cols-2 gap-4 rounded-xl border p-6">
                    <div className="col-span-2 xl:col-span-1">
                        {file.type === 'video' ? (
                            <VideoPlayer streamUrl={streamUrl} mimeType={file.mime_type} />
                        ) : (
                            <AudioPlayer streamUrl={streamUrl} />
                        )}
                    </div>
                    <div className="col-span-2 xl:col-span-1 flex flex-col gap-4">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="flex flex-col gap-1">
                                <h1 className="text-lg font-semibold">{file.name}</h1>
                                <p className="text-muted-foreground text-sm">
                                    {file.type === 'video' ? 'Видео' : 'Аудио'} ·{' '}
                                    {formatBytes(file.size)} · {file.mime_type}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                    Загружен:{' '}
                                    {format(parseISO(file.created_at), 'dd.MM.yyyy HH:mm')}
                                    {file.folder && (
                                        <>
                                            <br />
                                            Папка: {file.folder.name}
                                        </>
                                    )}
                                </p>
                                {file.description && (
                                    <div className="mt-1 flex flex-col gap-0.5">
                                        <span className="text-xs font-medium">Описание</span>
                                        <p className="text-muted-foreground text-sm">{file.description}</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                                {canDownload && (
                                    <a
                                        href={downloadUrl}
                                        download
                                        className="hover:bg-muted flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm"
                                    >
                                        <Download className="size-3.5" />
                                        Скачать
                                    </a>
                                )}
                                {isAdmin && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={openEditDialog}
                                        className="gap-1.5"
                                    >
                                        <Pencil className="size-3.5" />
                                        Редактировать
                                    </Button>
                                )}
                                {isAdmin && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowDeleteDialog(true)}
                                        className="border-destructive/30 text-destructive hover:bg-destructive/10 gap-1.5"
                                    >
                                        <Trash2 className="size-3.5" />
                                        Удалить
                                    </Button>
                                )}
                            </div>
                        </div>
                        <Separator />
                        <CommentsSection fileId={file.id} comments={file.comments} />
                    </div>
                </div>
            </div>

            <Dialog
                open={showEditDialog}
                onOpenChange={(open) => {
                    if (!open) {
                        clearErrors();
                        setShowEditDialog(false);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Редактировать файл</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEdit} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="file-name">Название</Label>
                            <Input
                                id="file-name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                autoFocus
                            />
                            {errors.name && (
                                <p className="text-xs text-destructive">{errors.name}</p>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="file-description">Описание</Label>
                            <Textarea
                                id="file-description"
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                                placeholder="Необязательно"
                                maxLength={500}
                                rows={4}
                            />
                            <div className="flex items-center justify-between">
                                {errors.description
                                    ? <p className="text-xs text-destructive">{errors.description}</p>
                                    : <span />
                                }
                                <p className={`text-xs ${data.description.length >= 500 ? 'text-destructive' : 'text-muted-foreground'}`}>
                                    {data.description.length}/500
                                </p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowEditDialog(false)}
                                disabled={processing}
                            >
                                Отмена
                            </Button>
                            <Button type="submit" disabled={processing || !data.name.trim()}>
                                {processing ? 'Сохранение…' : 'Сохранить'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog
                open={showDeleteDialog}
                onOpenChange={(open) => !open && setShowDeleteDialog(false)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Удалить файл</DialogTitle>
                        <DialogDescription>
                            Вы уверены, что хотите удалить{' '}
                            <span className="text-foreground font-medium">{file.name}</span>? Это
                            действие нельзя отменить.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowDeleteDialog(false)}
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
        </>
    );
}

FilesShow.layout = {
    breadcrumbs: [
        { title: 'Главная', href: dashboard() },
        { title: 'Файлы', href: filesRoute.index() },
        { title: 'Просмотр файла', href: '#' },
    ],
};
