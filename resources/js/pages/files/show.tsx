import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Download, Trash2, UserMinus, UserPlus, Users } from 'lucide-react';
import * as React from 'react';

import { AudioPlayer } from '@/components/players/audio-player';
import { VideoPlayer } from '@/components/players/video-player';
import { Comment, CommentsSection } from '@/components/comments-section';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import * as fileAccessRoute from '@/actions/App/Http/Controllers/Admin/FileAccessController';
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

interface FileAccessRecord {
    id: number;
    user_id: number;
    user: { id: number; name: string };
}

interface EligibleUser {
    id: number;
    name: string;
}

interface FileRecord {
    id: number;
    name: string;
    mime_type: string;
    type: 'video' | 'audio';
    size: number;
    folder: FileFolder | null;
    user: FileOwner;
    created_at: string;
    comments: Comment[];
    accesses: FileAccessRecord[];
}

interface Props {
    file: FileRecord;
    streamUrl: string;
    downloadUrl: string;
    canDownload: boolean;
    eligibleUsers: EligibleUser[];
}

// ─── Access management (admin only) ───────────────────────────────────────────

function AccessSection({ file, eligibleUsers }: { file: FileRecord; eligibleUsers: EligibleUser[] }) {
    const { data, setData, post, processing, reset } = useForm({ user_id: '' });
    const [revokingId, setRevokingId] = React.useState<number | null>(null);

    function handleGrant(e: React.FormEvent) {
        e.preventDefault();
        post(fileAccessRoute.store(file.id).url, {
            preserveScroll: true,
            onSuccess: () => reset(),
        });
    }

    function handleRevoke(userId: number) {
        setRevokingId(userId);
        router.delete(fileAccessRoute.destroy({ fileId: file.id, userId }).url, {
            preserveScroll: true,
            onFinish: () => setRevokingId(null),
        });
    }

    return (
        <div className="border-sidebar-border/70 dark:border-sidebar-border rounded-xl border p-6">
            <div className="mb-4 flex items-center gap-2">
                <Users className="text-muted-foreground size-4" />
                <h2 className="font-semibold">
                    Доступ{' '}
                    <span className="text-muted-foreground font-normal">
                        ({file.accesses.length})
                    </span>
                </h2>
            </div>

            {eligibleUsers.length > 0 && (
                <form onSubmit={handleGrant} className="mb-4 flex items-center gap-2">
                    <Select value={data.user_id} onValueChange={(v) => setData('user_id', v)}>
                        <SelectTrigger className="h-8 flex-1 text-sm">
                            <SelectValue placeholder="Выберите пользователя…" />
                        </SelectTrigger>
                        <SelectContent>
                            {eligibleUsers.map((u) => (
                                <SelectItem key={u.id} value={String(u.id)}>
                                    {u.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button
                        type="submit"
                        size="sm"
                        className="h-8 shrink-0"
                        disabled={processing || !data.user_id}
                    >
                        <UserPlus className="size-3.5" />
                        Выдать
                    </Button>
                </form>
            )}

            {file.accesses.length === 0 ? (
                <p className="text-muted-foreground py-2 text-sm">
                    Никому не выдан доступ к этому файлу.
                </p>
            ) : (
                <div className="divide-y">
                    {file.accesses.map((access) => (
                        <div key={access.id} className="flex items-center justify-between py-2.5">
                            <div className="flex items-center gap-2.5">
                                <Avatar className="size-7">
                                    <AvatarFallback className="text-xs font-medium uppercase">
                                        {access.user.name.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{access.user.name}</span>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-7 text-muted-foreground hover:bg-transparent hover:text-destructive"
                                disabled={revokingId === access.user_id}
                                onClick={() => handleRevoke(access.user_id)}
                            >
                                <UserMinus className="size-3.5" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FilesShow({ file, streamUrl, downloadUrl, canDownload, eligibleUsers }: Props) {
    const { auth } = usePage().props;
    const isAdmin = auth.user.is_admin;

    const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);

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

                {isAdmin && (
                    <AccessSection file={file} eligibleUsers={eligibleUsers} />
                )}
            </div>

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
