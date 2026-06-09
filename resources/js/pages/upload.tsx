import { Head, router } from '@inertiajs/react';
import { AlertCircle, CheckCircle2, Clock, CloudUpload, Film, Music } from 'lucide-react';
import { useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import type { FileRejection } from 'react-dropzone';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { cn, formatBytes } from '@/lib/utils';
import { dashboard } from '@/routes';
import * as uploadRoute from '@/routes/upload';

const MAX_SIZE_BYTES = 500 * 1024 * 1024;

const ACCEPTED_TYPES = {
    'video/mp4': ['.mp4'],
    'video/x-matroska': ['.mkv'],
    'video/x-msvideo': ['.avi'],
    'audio/mpeg': ['.mp3'],
    'audio/wav': ['.wav'],
    'audio/x-wav': ['.wav'],
    'audio/flac': ['.flac'],
    'audio/x-flac': ['.flac'],
    'audio/ogg': ['.ogg'],
};

type FileStatus = 'pending' | 'uploading' | 'done' | 'error';

interface QueueItem {
    id: string;
    file: File;
    name: string;
    size: number;
    mediaType: 'video' | 'audio';
    status: FileStatus;
    progress: number;
    description: string;
    error?: string;
}

export default function UploadPage() {
    const [queue, setQueueState] = useState<QueueItem[]>([]);
    const queueRef = useRef<QueueItem[]>([]);
    const uploadingRef = useRef<string | null>(null);
    const startNextRef = useRef<() => void>(() => {});

    const setQueue = (items: QueueItem[]) => {
        queueRef.current = items;
        setQueueState([...items]);
    };

    const startNext = () => {
        if (uploadingRef.current) {
            return;
        }

        const next = queueRef.current.find((q) => q.status === 'pending');

        if (!next) {
            return;
        }

        uploadingRef.current = next.id;
        setQueue(queueRef.current.map((q) => (q.id === next.id ? { ...q, status: 'uploading' as const } : q)));

        router.post(uploadRoute.store.url(), { file: next.file, description: next.description || null }, {
            forceFormData: true,
            preserveState: true,
            preserveScroll: true,
            onProgress: (p) => {
                if (!p) {
                    return;
                }

                setQueue(queueRef.current.map((q) => (q.id === next.id ? { ...q, progress: p.percentage ?? 0 } : q)));
            },
            onSuccess: () => {
                uploadingRef.current = null;
                toast.success(`${next.name} загружен`);
                setQueue(queueRef.current.map((q) => (q.id === next.id ? { ...q, status: 'done' as const, progress: 100 } : q)));
                startNextRef.current();
            },
            onError: (errors) => {
                uploadingRef.current = null;
                const msg = (Object.values(errors)[0] as string) ?? 'Upload failed';
                toast.error(`${next.name}: ${msg}`);
                setQueue(queueRef.current.map((q) => (q.id === next.id ? { ...q, status: 'error' as const, error: msg } : q)));
                startNextRef.current();
            },
        });
    };

    startNextRef.current = startNext;

    const updateDescription = (id: string, description: string) => {
        setQueue(queueRef.current.map((q) => (q.id === id ? { ...q, description } : q)));
    };

    const onDrop = (accepted: File[], rejected: FileRejection[]) => {
        rejected.forEach(({ file, errors }) => {
            const msg =
                errors[0]?.code === 'file-too-large' ? `${file.name} превышает 500 МБ` : `${file.name}: неподдерживаемый формат`;
            toast.error(msg);
        });

        if (!accepted.length) {
            return;
        }

        const newItems: QueueItem[] = accepted.map((file) => ({
            id: crypto.randomUUID(),
            file,
            name: file.name,
            size: file.size,
            mediaType: file.type.startsWith('video/') ? 'video' : 'audio',
            status: 'pending' as const,
            progress: 0,
            description: '',
        }));

        setQueue([...queueRef.current, ...newItems]);
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: ACCEPTED_TYPES,
        maxSize: MAX_SIZE_BYTES,
        multiple: true,
    });

    const completedCount = queue.filter((q) => q.status === 'done' || q.status === 'error').length;
    const pendingCount = queue.filter((q) => q.status === 'pending').length;
    const isUploading = queue.some((q) => q.status === 'uploading');

    return (
        <>
            <Head title="Загрузка" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 lg:p-6">
                {/* Drop zone */}
                <div
                    {...getRootProps()}
                    className={cn(
                        'flex flex-1 cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-10 text-center transition-colors',
                        isDragActive
                            ? 'border-primary bg-primary/5'
                            : 'border-sidebar-border/70 hover:border-primary/40 dark:border-sidebar-border',
                    )}
                >
                    <input {...getInputProps()} />
                    <div
                        className={cn(
                            'flex size-16 items-center justify-center rounded-full transition-colors',
                            isDragActive ? 'bg-primary/10' : 'bg-muted',
                        )}
                    >
                        <CloudUpload
                            className={cn('size-8 transition-colors', isDragActive ? 'text-primary' : 'text-muted-foreground')}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <p className="text-sm font-medium">{isDragActive ? 'Отпустите файлы' : 'Перетащите файлы сюда'}</p>
                        <p className="text-xs text-muted-foreground">или нажмите для выбора · MP4, MKV, AVI, MP3, WAV, FLAC, OGG · макс 500 МБ</p>
                    </div>
                </div>

                {/* Queue */}
                {queue.length > 0 && (
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-medium">Очередь ({queue.length})</h2>
                            <div className="flex items-center gap-2">
                                {pendingCount > 0 && !isUploading && (
                                    <Button size="sm" onClick={startNext}>
                                        Загрузить ({pendingCount})
                                    </Button>
                                )}
                                {completedCount > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setQueue(queueRef.current.filter((q) => q.status !== 'done' && q.status !== 'error'))}
                                    >
                                        Очистить завершённые ({completedCount})
                                    </Button>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            {queue.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex flex-col gap-2 rounded-lg border border-sidebar-border/70 p-3 dark:border-sidebar-border"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                                            {item.mediaType === 'video' ? (
                                                <Film className="size-4 text-muted-foreground" />
                                            ) : (
                                                <Music className="size-4 text-muted-foreground" />
                                            )}
                                        </div>
                                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                            <p className="truncate text-sm font-medium">{item.name}</p>
                                            <p className="text-xs text-muted-foreground">{formatBytes(item.size)}</p>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-2">
                                            {item.status === 'done' && <CheckCircle2 className="size-4 text-green-500" />}
                                            {item.status === 'error' && <AlertCircle className="size-4 text-destructive" />}
                                            {item.status === 'pending' && <Clock className="size-4 text-muted-foreground" />}
                                            {item.status === 'uploading' && (
                                                <span className="tabular-nums text-xs text-muted-foreground">{item.progress}%</span>
                                            )}
                                        </div>
                                    </div>
                                    {item.status === 'pending' && (
                                        <Textarea
                                            placeholder="Описание (необязательно)"
                                            value={item.description}
                                            onChange={(e) => updateDescription(item.id, e.target.value)}
                                            rows={2}
                                            className="resize-none text-xs"
                                        />
                                    )}
                                    {item.status === 'done' && item.description && (
                                        <p className="text-xs text-muted-foreground">{item.description}</p>
                                    )}
                                    {item.status === 'uploading' && <Progress value={item.progress} className="h-1.5" />}
                                    {item.status === 'error' && item.error && (
                                        <p className="text-xs text-destructive">{item.error}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Supported types legend */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {(['MP4', 'MKV', 'AVI'] as const).map((ext) => (
                        <div
                            key={ext}
                            className="flex items-center gap-2 rounded-lg border border-sidebar-border/70 p-3 dark:border-sidebar-border"
                        >
                            <Film className="size-4 shrink-0 text-muted-foreground" />
                            <span className="text-xs font-medium">{ext}</span>
                        </div>
                    ))}
                    {(['MP3', 'WAV', 'FLAC', 'OGG'] as const).map((ext) => (
                        <div
                            key={ext}
                            className="flex items-center gap-2 rounded-lg border border-sidebar-border/70 p-3 dark:border-sidebar-border"
                        >
                            <Music className="size-4 shrink-0 text-muted-foreground" />
                            <span className="text-xs font-medium">{ext}</span>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}

UploadPage.layout = {
    breadcrumbs: [
        { title: 'Главная', href: dashboard() },
        { title: 'Загрузка', href: uploadRoute.create() },
    ],
};
