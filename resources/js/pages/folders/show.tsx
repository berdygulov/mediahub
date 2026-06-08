import {
    ColumnDef,
    ColumnFiltersState,
    ExpandedState,
    SortingState,
    flexRender,
    getCoreRowModel,
    getExpandedRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { Head, Link, router, setLayoutProps, useForm, usePage } from '@inertiajs/react';
import { UserMinus, UserPlus, Users } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import {
    AlertCircle,
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Clock,
    Download,
    Eye,
    Film,
    Folder,
    FolderInput,
    FolderPlus,
    MoreHorizontal,
    Music,
    Pencil,
    Play,
    Trash2,
    Upload,
} from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { buildTree, FlatFolder, FolderNodeItem, getAncestorIds } from '@/components/folder-node-item';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMediaPlayer } from '@/contexts/media-player-context';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatBytes } from '@/lib/utils';
import { dashboard } from '@/routes';
import * as folderAccessRoute from '@/actions/App/Http/Controllers/Admin/FolderAccessController';
import * as filesRoute from '@/routes/files';
import * as foldersRoute from '@/routes/folders';
import * as uploadRoute from '@/routes/upload';

const ACCEPTED_EXTENSIONS = '.mp4,.mkv,.avi,.mp3,.wav,.flac,.ogg';
const MAX_SIZE_BYTES = 500 * 1024 * 1024;

type FileStatus = 'pending' | 'uploading' | 'done' | 'error';

interface QueueItem {
    id: string;
    file: File;
    name: string;
    size: number;
    mediaType: 'video' | 'audio';
    status: FileStatus;
    progress: number;
    error?: string;
}

interface FolderItem {
    id: number;
    name: string;
    children_count: number;
    files_count: number;
    created_at: string;
}

interface FileItem {
    id: number;
    name: string;
    description: string | null;
    type: 'video' | 'audio';
    mime_type: string;
    size: number;
    created_at: string;
}

interface AncestorItem {
    id: number;
    name: string;
}

interface AccessRecord {
    id: number;
    user_id: number;
    user: { id: number; name: string };
}

interface EligibleUser {
    id: number;
    name: string;
}

interface Props {
    folder: FolderItem;
    subfolders: FolderItem[];
    files: FileItem[];
    ancestors: AncestorItem[];
    accesses: AccessRecord[];
    eligibleUsers: EligibleUser[];
}

interface TableRow {
    kind: 'folder' | 'file';
    id: number;
    name: string;
    description: string | null;
    created_at: string;
    displayType: string;
    size: number | null;
    media_type: 'video' | 'audio' | null;
    mime_type: string | null;
    href: string;
}

function ruPlural(n: number, one: string, few: string, many: string): string {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return `${n} ${one}`;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} ${few}`;
    return `${n} ${many}`;
}

function folderMeta(folder: FolderItem): string {
    const parts: string[] = [];
    if (folder.children_count > 0) {
        parts.push(ruPlural(folder.children_count, 'подпапка', 'подпапки', 'подпапок'));
    }
    if (folder.files_count > 0) {
        parts.push(ruPlural(folder.files_count, 'файл', 'файла', 'файлов'));
    }
    return parts.join(' · ') || 'Пустая';
}

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
    if (!sorted) return <ArrowUpDown className="ml-1 inline size-3 opacity-40" />;
    return sorted === 'asc' ? (
        <ArrowUp className="ml-1 inline size-3" />
    ) : (
        <ArrowDown className="ml-1 inline size-3" />
    );
}

export default function FoldersShow({ folder, subfolders, files, ancestors, accesses, eligibleUsers }: Props) {
    const { auth } = usePage().props;
    const isAdmin = auth.user.is_admin;
    const canCreateSubfolder = isAdmin && ancestors.length < 4;
    const { play } = useMediaPlayer();

    setLayoutProps({
        breadcrumbs: [
            { title: 'Главная', href: dashboard() },
            { title: 'Папки', href: foldersRoute.index() },
            ...ancestors.map((a) => ({ title: a.name, href: foldersRoute.show(a.id).url })),
            { title: folder.name, href: foldersRoute.show(folder.id).url },
        ],
    });

    const [showCreate, setShowCreate] = React.useState(false);
    const { data, setData, post, processing, errors, clearErrors } = useForm({
        name: '',
        parent_id: folder.id,
    });

    const { data: accessData, setData: setAccessData, post: postAccess, processing: accessProcessing, reset: resetAccess } = useForm({ user_id: '' });
    const [revokingId, setRevokingId] = React.useState<number | null>(null);

    function handleGrantAccess(e: React.FormEvent) {
        e.preventDefault();
        postAccess(folderAccessRoute.store(folder.id).url, {
            preserveScroll: true,
            onSuccess: () => resetAccess(),
        });
    }

    function handleRevokeAccess(userId: number) {
        setRevokingId(userId);
        router.delete(folderAccessRoute.destroy({ folderId: folder.id, userId }).url, {
            preserveScroll: true,
            onFinish: () => setRevokingId(null),
        });
    }

    // Upload queue
    const [uploadQueue, setUploadQueueState] = React.useState<QueueItem[]>([]);
    const queueRef = React.useRef<QueueItem[]>([]);
    const uploadingRef = React.useRef<string | null>(null);
    const startNextRef = React.useRef<() => void>(() => {});
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const setUploadQueue = (items: QueueItem[]) => {
        queueRef.current = items;
        setUploadQueueState([...items]);
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
        setUploadQueue(queueRef.current.map((q) => (q.id === next.id ? { ...q, status: 'uploading' as const } : q)));

        router.post(
            uploadRoute.store.url(),
            { file: next.file, folder_id: folder.id },
            {
                forceFormData: true,
                preserveState: true,
                preserveScroll: true,
                onProgress: (p) => {
                    if (!p) return;
                    setUploadQueue(queueRef.current.map((q) => (q.id === next.id ? { ...q, progress: p.percentage ?? 0 } : q)));
                },
                onSuccess: () => {
                    uploadingRef.current = null;
                    toast.success(`${next.name} загружен`);
                    setUploadQueue(queueRef.current.map((q) => (q.id === next.id ? { ...q, status: 'done' as const, progress: 100 } : q)));
                    startNextRef.current();
                },
                onError: (errs) => {
                    uploadingRef.current = null;
                    const msg = (Object.values(errs)[0] as string) ?? 'Ошибка загрузки';
                    toast.error(`${next.name}: ${msg}`);
                    setUploadQueue(queueRef.current.map((q) => (q.id === next.id ? { ...q, status: 'error' as const, error: msg } : q)));
                    startNextRef.current();
                },
            },
        );
    };

    startNextRef.current = startNext;

    const handleFilesSelected = (selectedFiles: FileList | null) => {
        if (!selectedFiles || selectedFiles.length === 0) return;

        const newItems: QueueItem[] = [];

        Array.from(selectedFiles).forEach((file) => {
            if (file.size > MAX_SIZE_BYTES) {
                toast.error(`${file.name} превышает 500 МБ`);
                return;
            }
            newItems.push({
                id: crypto.randomUUID(),
                file,
                name: file.name,
                size: file.size,
                mediaType: file.type.startsWith('video/') ? 'video' : 'audio',
                status: 'pending' as const,
                progress: 0,
            });
        });

        if (newItems.length === 0) return;

        setUploadQueue([...queueRef.current, ...newItems]);
        startNext();

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const completedUploadCount = uploadQueue.filter((q) => q.status === 'done' || q.status === 'error').length;

    const [showDeleteFolder, setShowDeleteFolder] = React.useState(false);
    const [isDeletingFolder, setIsDeletingFolder] = React.useState(false);

    const [showRenameFolder, setShowRenameFolder] = React.useState(false);
    const {
        data: renameData,
        setData: setRenameData,
        patch: renamePatch,
        processing: renameProcessing,
        errors: renameErrors,
        clearErrors: clearRenameErrors,
    } = useForm({ name: folder.name });

    const [subfolderToDelete, setSubfolderToDelete] = React.useState<FolderItem | null>(null);
    const [isDeletingSubfolder, setIsDeletingSubfolder] = React.useState(false);

    const [subfolderToRename, setSubfolderToRename] = React.useState<FolderItem | null>(null);
    const {
        data: subRenameData,
        setData: setSubRenameData,
        patch: subRenamePatch,
        processing: subRenameProcessing,
        errors: subRenameErrors,
        clearErrors: clearSubRenameErrors,
    } = useForm({ name: '' });

    const [fileToDelete, setFileToDelete] = React.useState<FileItem | null>(null);
    const [isDeleting, setIsDeleting] = React.useState(false);

    const [fileToMove, setFileToMove] = React.useState<FileItem | null>(null);
    const [foldersList, setFoldersList] = React.useState<FlatFolder[]>([]);
    const [foldersLoading, setFoldersLoading] = React.useState(false);
    const [selectedFolderId, setSelectedFolderId] = React.useState<number | null>(null);
    const [isMoving, setIsMoving] = React.useState(false);

    React.useEffect(() => {
        if (!fileToMove) {
            return;
        }

        setSelectedFolderId(folder.id);
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

    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [expanded, setExpanded] = React.useState<ExpandedState>({});

    const rows = React.useMemo<TableRow[]>(
        () => [
            ...subfolders.map(
                (f): TableRow => ({
                    kind: 'folder',
                    id: f.id,
                    name: f.name,
                    description: null,
                    created_at: f.created_at,
                    displayType: 'Папка',
                    size: null,
                    media_type: null,
                    mime_type: null,
                    href: foldersRoute.show(f.id).url,
                }),
            ),
            ...files.map(
                (f): TableRow => ({
                    kind: 'file',
                    id: f.id,
                    name: f.name,
                    description: f.description,
                    created_at: f.created_at,
                    displayType: f.mime_type,
                    size: f.size,
                    media_type: f.type,
                    mime_type: f.mime_type,
                    href: filesRoute.show(f.id).url,
                }),
            ),
        ],
        [subfolders, files],
    );

    const columns = React.useMemo<ColumnDef<TableRow>[]>(
        () => [
            {
                id: 'kind',
                accessorKey: 'kind',
                filterFn: 'equals',
                enableSorting: false,
            },
            {
                accessorKey: 'name',
                header: 'Название',
                filterFn: 'includesString',
                cell: ({ row }) => {
                    const r = row.original;
                    return (
                        <div className="flex items-center gap-2">
                            {r.kind === 'folder' ? (
                                <Folder className="size-4 shrink-0 text-amber-500" />
                            ) : r.media_type === 'video' ? (
                                <Film className="size-4 shrink-0 text-blue-500" />
                            ) : (
                                <Music className="size-4 shrink-0 text-purple-500" />
                            )}
                            <span className="max-w-[240px] truncate font-medium">{r.name}</span>
                        </div>
                    );
                },
            },
            {
                accessorKey: 'description',
                header: 'Описание',
                enableSorting: false,
                cell: ({ row }) => {
                    const val = row.original.description;
                    if (row.original.kind === 'folder' || !val) {
                        return <span className="text-muted-foreground/40 text-sm">—</span>;
                    }
                    return (
                        <button
                            className="flex max-w-[220px] items-center gap-1 text-left"
                            onClick={(e) => { e.stopPropagation(); row.toggleExpanded(); }}
                        >
                            <span className="text-muted-foreground truncate text-sm">{val}</span>
                            {row.getIsExpanded()
                                ? <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
                                : <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                            }
                        </button>
                    );
                },
            },
            {
                accessorKey: 'created_at',
                header: ({ column }) => (
                    <button
                        className="flex cursor-pointer items-center hover:text-foreground"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    >
                        Дата создания <SortIcon sorted={column.getIsSorted()} />
                    </button>
                ),
                cell: ({ getValue }) => (
                    <span className="text-muted-foreground whitespace-nowrap text-sm">
                        {format(parseISO(getValue() as string), 'dd.MM.yyyy HH:mm')}
                    </span>
                ),
            },
            {
                accessorKey: 'displayType',
                header: ({ column }) => (
                    <button
                        className="flex cursor-pointer items-center hover:text-foreground"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    >
                        Тип <SortIcon sorted={column.getIsSorted()} />
                    </button>
                ),
                cell: ({ getValue }) => (
                    <span className="text-muted-foreground text-xs">{getValue() as string}</span>
                ),
            },
            {
                accessorKey: 'size',
                header: ({ column }) => (
                    <button
                        className="flex cursor-pointer items-center hover:text-foreground"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    >
                        Размер <SortIcon sorted={column.getIsSorted()} />
                    </button>
                ),
                cell: ({ getValue }) => {
                    const val = getValue() as number | null;
                    return (
                        <span className="text-muted-foreground">
                            {val === null ? '—' : formatBytes(val)}
                        </span>
                    );
                },
                sortingFn: (a, b) => (a.original.size ?? -1) - (b.original.size ?? -1),
            },
            {
                id: 'actions',
                header: '',
                cell: ({ row }) => {
                    const r = row.original;
                    if (r.kind === 'folder') {
                        if (!isAdmin) return null;
                        return (
                            <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="size-7">
                                            <MoreHorizontal className="size-3.5" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                            onClick={() => {
                                                const sf = subfolders.find((f) => f.id === r.id);
                                                if (!sf) return;
                                                clearSubRenameErrors();
                                                setSubRenameData('name', sf.name);
                                                setSubfolderToRename(sf);
                                            }}
                                        >
                                            <Pencil className="mr-2 size-4" />
                                            Переименовать
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            className="text-destructive focus:text-destructive"
                                            onClick={() => setSubfolderToDelete(subfolders.find((f) => f.id === r.id) ?? null)}
                                        >
                                            <Trash2 className="mr-2 size-4" />
                                            Удалить
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        );
                    }
                    if (!r.media_type || !r.mime_type) return null;
                    return (
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-7"
                                title="Воспроизвести"
                                onClick={() =>
                                    play({
                                        id: r.id,
                                        name: r.name,
                                        description: r.description,
                                        type: r.media_type!,
                                        mime_type: r.mime_type!,
                                        size: r.size!,
                                        created_at: r.created_at,
                                        folder: { name: folder.name },
                                        streamUrl: filesRoute.stream(r.id).url,
                                    })
                                }
                            >
                                <Play className="size-3.5" />
                            </Button>
                            <Link href={filesRoute.show(r.id).url}>
                                <Button variant="ghost" size="icon" className="size-7" title="Просмотр">
                                    <Eye className="size-3.5" />
                                </Button>
                            </Link>
                            {isAdmin && (
                                <a href={filesRoute.download(r.id).url}>
                                    <Button variant="ghost" size="icon" className="size-7" title="Скачать">
                                        <Download className="size-3.5" />
                                    </Button>
                                </a>
                            )}
                            {isAdmin && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-7"
                                    title="Переместить в папку"
                                    onClick={() => setFileToMove(files.find((f) => f.id === r.id) ?? null)}
                                >
                                    <FolderInput className="size-3.5" />
                                </Button>
                            )}
                            {isAdmin && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive size-7"
                                    title="Удалить"
                                    onClick={() => setFileToDelete(files.find((f) => f.id === r.id) ?? null)}
                                >
                                    <Trash2 className="size-3.5" />
                                </Button>
                            )}
                        </div>
                    );
                },
            },
        ],
        [folder.name, play, isAdmin, files, subfolders],
    );

    const table = useReactTable({
        data: rows,
        columns,
        state: {
            sorting,
            columnFilters,
            columnVisibility: { kind: false },
            expanded,
        },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onExpandedChange: setExpanded,
        getRowCanExpand: (row) => Boolean(row.original.description),
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
    });

    const folderTree = React.useMemo(() => buildTree(foldersList), [foldersList]);
    const ancestorIds = React.useMemo(
        () => getAncestorIds(foldersList, folder.id),
        [foldersList, folder.id],
    );
    const isMoveUnchanged = selectedFolderId === folder.id;

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

    function handleDeleteSubfolder() {
        if (!subfolderToDelete) return;
        setIsDeletingSubfolder(true);
        router.delete(foldersRoute.destroy(subfolderToDelete.id).url, {
            onFinish: () => {
                setIsDeletingSubfolder(false);
                setSubfolderToDelete(null);
            },
        });
    }

    function handleRenameSubfolder(e: React.FormEvent) {
        e.preventDefault();
        if (!subfolderToRename) return;
        subRenamePatch(foldersRoute.update(subfolderToRename.id).url, {
            onSuccess: () => {
                clearSubRenameErrors();
                setSubfolderToRename(null);
            },
        });
    }

    function handleDeleteFolder() {
        setIsDeletingFolder(true);
        router.delete(foldersRoute.destroy(folder.id).url, {
            onFinish: () => setIsDeletingFolder(false),
        });
    }

    function openRenameFolder() {
        clearRenameErrors();
        setRenameData('name', folder.name);
        setShowRenameFolder(true);
    }

    function handleRenameFolder(e: React.FormEvent) {
        e.preventDefault();
        renamePatch(foldersRoute.update(folder.id).url, {
            onSuccess: () => setShowRenameFolder(false),
        });
    }

    function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        post(foldersRoute.store.url(), {
            onSuccess: () => {
                clearErrors();
                setData('name', '');
                setShowCreate(false);
            },
        });
    }

    function openCreate() {
        clearErrors();
        setData('name', '');
        setData('parent_id', folder.id);
        setShowCreate(true);
    }

    return (
        <>
            <Head title={folder.name} />

            <div className="flex h-full flex-1 flex-col gap-4 p-4 lg:p-6">
                {/* Folder header */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                            <Folder className="size-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold">{folder.name}</h1>
                            <p className="text-xs text-muted-foreground">{folderMeta(folder)}</p>
                        </div>
                    </div>
                    {isAdmin && (
                        <div className="flex items-center gap-2">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept={ACCEPTED_EXTENSIONS}
                                multiple
                                className="hidden"
                                onChange={(e) => handleFilesSelected(e.target.files)}
                            />
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1.5"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload className="size-3.5" />
                                <span className="hidden sm:inline">Загрузить файлы</span>
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button size="sm" variant="outline" className="h-8 w-8 px-0">
                                        <MoreHorizontal className="size-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={openRenameFolder}>
                                        <Pencil className="mr-2 size-4" />
                                        Переименовать
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        className="text-destructive focus:text-destructive"
                                        onClick={() => setShowDeleteFolder(true)}
                                    >
                                        <Trash2 className="mr-2 size-4" />
                                        Удалить
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            {canCreateSubfolder && (
                                <Button size="sm" className="h-8 gap-1.5" onClick={openCreate}>
                                    <FolderPlus className="size-3.5" />
                                    <span className="hidden sm:inline">Новая подпапка</span>
                                </Button>
                            )}
                        </div>
                    )}
                </div>

                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-2">
                    <Input
                        placeholder="Поиск файлов и папок…"
                        value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
                        onChange={(e) => table.getColumn('name')?.setFilterValue(e.target.value)}
                        className="h-8 w-52"
                    />
                    <Select
                        value={(table.getColumn('kind')?.getFilterValue() as string) ?? 'all'}
                        onValueChange={(val) =>
                            table.getColumn('kind')?.setFilterValue(val === 'all' ? undefined : val)
                        }
                    >
                        <SelectTrigger size="sm" className="w-32">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Все типы</SelectItem>
                            <SelectItem value="folder">
                                <span className="flex items-center gap-1.5">
                                    <Folder className="size-3.5 text-amber-500" />
                                    Папки
                                </span>
                            </SelectItem>
                            <SelectItem value="file">
                                <span className="flex items-center gap-1.5">
                                    <Film className="size-3.5 text-blue-500" />
                                    Файлы
                                </span>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Upload queue */}
                {uploadQueue.length > 0 && (
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-medium">Очередь загрузки ({uploadQueue.length})</h2>
                            {completedUploadCount > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setUploadQueue(queueRef.current.filter((q) => q.status !== 'done' && q.status !== 'error'))}
                                >
                                    Очистить завершённые ({completedUploadCount})
                                </Button>
                            )}
                        </div>
                        <div className="flex flex-col gap-2">
                            {uploadQueue.map((item) => (
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
                                    {item.status === 'uploading' && <Progress value={item.progress} className="h-1.5" />}
                                    {item.status === 'error' && item.error && (
                                        <p className="text-xs text-destructive">{item.error}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Table */}
                <div className="rounded-xl border overflow-hidden">
                    {rows.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
                            <div className="bg-muted flex size-12 items-center justify-center rounded-full">
                                <Folder className="text-muted-foreground size-5" />
                            </div>
                            <p className="text-sm font-medium">Папка пуста</p>
                            {canCreateSubfolder && (
                                <button
                                    className="text-primary text-xs underline underline-offset-4"
                                    onClick={openCreate}
                                >
                                    Создать подпапку
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Mobile: card list */}
                            <div className="divide-y md:hidden">
                                {table.getRowModel().rows.length === 0 ? (
                                    <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                                        Ничего не найдено
                                    </p>
                                ) : (
                                    table.getRowModel().rows.map((row) => {
                                        const item = row.original;
                                        return (
                                            <div
                                                key={row.id}
                                                className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
                                                onClick={() => router.visit(item.href)}
                                            >
                                                {item.kind === 'folder' ? (
                                                    <Folder className="size-4 shrink-0 text-amber-500" />
                                                ) : item.media_type === 'video' ? (
                                                    <Film className="size-4 shrink-0 text-blue-500" />
                                                ) : (
                                                    <Music className="size-4 shrink-0 text-purple-500" />
                                                )}
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-medium">{item.name}</p>
                                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                                                        <span>{item.displayType}</span>
                                                        {item.size !== null && <span>{formatBytes(item.size)}</span>}
                                                        <span className="whitespace-nowrap">
                                                            {format(parseISO(item.created_at), 'dd.MM.yyyy')}
                                                        </span>
                                                    </div>
                                                </div>
                                                {item.kind === 'folder' && isAdmin && (
                                                    <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="size-7">
                                                                    <MoreHorizontal className="size-3.5" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem
                                                                    onClick={() => {
                                                                        const sf = subfolders.find((f) => f.id === item.id);
                                                                        if (!sf) return;
                                                                        clearSubRenameErrors();
                                                                        setSubRenameData('name', sf.name);
                                                                        setSubfolderToRename(sf);
                                                                    }}
                                                                >
                                                                    <Pencil className="mr-2 size-4" />
                                                                    Переименовать
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    className="text-destructive focus:text-destructive"
                                                                    onClick={() => setSubfolderToDelete(subfolders.find((f) => f.id === item.id) ?? null)}
                                                                >
                                                                    <Trash2 className="mr-2 size-4" />
                                                                    Удалить
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                )}
                                                {item.kind === 'file' && item.media_type && item.mime_type && (
                                                    <div className="flex shrink-0 items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-7"
                                                            title="Воспроизвести"
                                                            onClick={() =>
                                                                play({
                                                                    id: item.id,
                                                                    name: item.name,
                                                                    description: item.description,
                                                                    type: item.media_type!,
                                                                    mime_type: item.mime_type!,
                                                                    size: item.size!,
                                                                    created_at: item.created_at,
                                                                    folder: { name: folder.name },
                                                                    streamUrl: filesRoute.stream(item.id).url,
                                                                })
                                                            }
                                                        >
                                                            <Play className="size-3.5" />
                                                        </Button>
                                                        <Link href={filesRoute.show(item.id).url}>
                                                            <Button variant="ghost" size="icon" className="size-7" title="Просмотр">
                                                                <Eye className="size-3.5" />
                                                            </Button>
                                                        </Link>
                                                        {isAdmin && (
                                                            <a href={filesRoute.download(item.id).url}>
                                                                <Button variant="ghost" size="icon" className="size-7" title="Скачать">
                                                                    <Download className="size-3.5" />
                                                                </Button>
                                                            </a>
                                                        )}
                                                        {isAdmin && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="size-7"
                                                                title="Переместить в папку"
                                                                onClick={() => setFileToMove(files.find((f) => f.id === item.id) ?? null)}
                                                            >
                                                                <FolderInput className="size-3.5" />
                                                            </Button>
                                                        )}
                                                        {isAdmin && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-destructive hover:text-destructive size-7"
                                                                title="Удалить"
                                                                onClick={() => setFileToDelete(files.find((f) => f.id === item.id) ?? null)}
                                                            >
                                                                <Trash2 className="size-3.5" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                            {/* Desktop: table */}
                            <div className="overflow-x-auto">
                            <table className="hidden w-full table-fixed text-sm md:table">
                                <colgroup>
                                    <col />
                                    <col />
                                    <col className="w-[130px]" />
                                    <col className="w-[100px]" />
                                    <col className="w-[80px]" />
                                    <col className="w-[96px]" />
                                </colgroup>
                                <thead className="bg-muted/50 border-b">
                                    {table.getHeaderGroups().map((headerGroup) => (
                                        <tr key={headerGroup.id}>
                                            {headerGroup.headers.map((header) => (
                                                <th
                                                    key={header.id}
                                                    className="text-muted-foreground px-4 py-2.5 text-left text-xs font-medium"
                                                >
                                                    {!header.isPlaceholder &&
                                                        flexRender(
                                                            header.column.columnDef.header,
                                                            header.getContext(),
                                                        )}
                                                </th>
                                            ))}
                                        </tr>
                                    ))}
                                </thead>
                                <tbody>
                                    {table.getRowModel().rows.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={table.getVisibleLeafColumns().length}
                                                className="px-4 py-10 text-center text-muted-foreground"
                                            >
                                                Ничего не найдено
                                            </td>
                                        </tr>
                                    ) : (
                                        table.getRowModel().rows.map((row) => (
                                            <React.Fragment key={row.id}>
                                                <tr
                                                    className="hover:bg-muted/30 border-b cursor-pointer transition-colors"
                                                    onClick={() => router.visit(row.original.href)}
                                                >
                                                    {row.getVisibleCells().map((cell) => (
                                                        <td key={cell.id} className="px-4 py-3">
                                                            {flexRender(
                                                                cell.column.columnDef.cell,
                                                                cell.getContext(),
                                                            )}
                                                        </td>
                                                    ))}
                                                </tr>
                                                {row.getIsExpanded() && (
                                                    <tr className="border-b bg-muted/20">
                                                        <td
                                                            colSpan={row.getVisibleCells().length}
                                                            className="px-6 pb-4 pt-2"
                                                        >
                                                            <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                                                                {row.original.description}
                                                            </p>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        ))
                                    )}
                                </tbody>
                            </table>
                            </div>
                        </>
                    )}
                </div>

            {/* Access management (admin only) */}
            {isAdmin && (
                <div className="rounded-xl border p-6">
                    <div className="mb-4 flex items-center gap-2">
                        <Users className="size-4 text-muted-foreground" />
                        <h2 className="font-semibold">
                            Доступ{' '}
                            <span className="font-normal text-muted-foreground">
                                ({accesses.length})
                            </span>
                        </h2>
                    </div>

                    {eligibleUsers.length > 0 && (
                        <form onSubmit={handleGrantAccess} className="mb-4 flex items-center gap-2">
                            <Select
                                value={accessData.user_id}
                                onValueChange={(v) => setAccessData('user_id', v)}
                            >
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
                                disabled={accessProcessing || !accessData.user_id}
                            >
                                <UserPlus className="size-3.5" />
                                Выдать
                            </Button>
                        </form>
                    )}

                    {accesses.length === 0 ? (
                        <p className="py-2 text-sm text-muted-foreground">
                            Никому не выдан доступ к этой папке.
                        </p>
                    ) : (
                        <div className="divide-y">
                            {accesses.map((access) => (
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
                                        onClick={() => handleRevokeAccess(access.user_id)}
                                    >
                                        <UserMinus className="size-3.5" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
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
                        <Button variant="outline" onClick={() => setFileToDelete(null)} disabled={isDeleting}>
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
                        <Button variant="outline" onClick={() => setFileToMove(null)} disabled={isMoving}>
                            Отмена
                        </Button>
                        <Button onClick={handleMoveFolder} disabled={isMoving || isMoveUnchanged}>
                            {isMoving ? 'Перемещение…' : 'Переместить'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete subfolder dialog */}
            <Dialog
                open={!!subfolderToDelete}
                onOpenChange={(open) => !isDeletingSubfolder && !open && setSubfolderToDelete(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Удалить папку</DialogTitle>
                        <DialogDescription asChild>
                            <div className="space-y-2">
                                <p>
                                    Вы уверены, что хотите удалить папку{' '}
                                    <span className="text-foreground font-medium">«{subfolderToDelete?.name}»</span>?
                                </p>
                                {subfolderToDelete && (subfolderToDelete.children_count > 0 || subfolderToDelete.files_count > 0) ? (
                                    <p>
                                        Папка содержит{' '}
                                        {[
                                            subfolderToDelete.children_count > 0
                                                ? ruPlural(subfolderToDelete.children_count, 'подпапку', 'подпапки', 'подпапок')
                                                : null,
                                            subfolderToDelete.files_count > 0
                                                ? ruPlural(subfolderToDelete.files_count, 'файл', 'файла', 'файлов')
                                                : null,
                                        ]
                                            .filter(Boolean)
                                            .join(' и ')}
                                        . Всё вложенное содержимое также будет безвозвратно удалено.
                                    </p>
                                ) : (
                                    <p>Это действие необратимо.</p>
                                )}
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setSubfolderToDelete(null)}
                            disabled={isDeletingSubfolder}
                        >
                            Отмена
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteSubfolder} disabled={isDeletingSubfolder}>
                            {isDeletingSubfolder ? 'Удаление…' : 'Удалить'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Rename subfolder dialog */}
            <Dialog
                open={!!subfolderToRename}
                onOpenChange={(open) => {
                    if (!open) {
                        clearSubRenameErrors();
                        setSubfolderToRename(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Переименовать папку</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleRenameSubfolder} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="subfolder-rename-name">Новое название</Label>
                            <Input
                                id="subfolder-rename-name"
                                value={subRenameData.name}
                                onChange={(e) => setSubRenameData('name', e.target.value)}
                                autoFocus
                            />
                            {subRenameErrors.name && (
                                <p className="text-xs text-destructive">{subRenameErrors.name}</p>
                            )}
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setSubfolderToRename(null)}
                                disabled={subRenameProcessing}
                            >
                                Отмена
                            </Button>
                            <Button type="submit" disabled={subRenameProcessing || !subRenameData.name.trim()}>
                                {subRenameProcessing ? 'Сохранение…' : 'Сохранить'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete folder dialog */}
            <Dialog open={showDeleteFolder} onOpenChange={(open) => !isDeletingFolder && setShowDeleteFolder(open)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Удалить папку</DialogTitle>
                        <DialogDescription asChild>
                            <div className="space-y-2">
                                <p>
                                    Вы уверены, что хотите удалить папку{' '}
                                    <span className="text-foreground font-medium">«{folder.name}»</span>?
                                </p>
                                {(folder.children_count > 0 || folder.files_count > 0) ? (
                                    <p>
                                        Папка содержит{' '}
                                        {[
                                            folder.children_count > 0
                                                ? ruPlural(folder.children_count, 'подпапку', 'подпапки', 'подпапок')
                                                : null,
                                            folder.files_count > 0
                                                ? ruPlural(folder.files_count, 'файл', 'файла', 'файлов')
                                                : null,
                                        ]
                                            .filter(Boolean)
                                            .join(' и ')}
                                        . Всё вложенное содержимое также будет безвозвратно удалено.
                                    </p>
                                ) : (
                                    <p>Это действие необратимо.</p>
                                )}
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowDeleteFolder(false)}
                            disabled={isDeletingFolder}
                        >
                            Отмена
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteFolder} disabled={isDeletingFolder}>
                            {isDeletingFolder ? 'Удаление…' : 'Удалить'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Rename folder dialog */}
            <Dialog
                open={showRenameFolder}
                onOpenChange={(open) => {
                    if (!open) clearRenameErrors();
                    setShowRenameFolder(open);
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Переименовать папку</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleRenameFolder} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="rename-folder-name">Новое название</Label>
                            <Input
                                id="rename-folder-name"
                                value={renameData.name}
                                onChange={(e) => setRenameData('name', e.target.value)}
                                autoFocus
                            />
                            {renameErrors.name && (
                                <p className="text-xs text-destructive">{renameErrors.name}</p>
                            )}
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowRenameFolder(false)}
                                disabled={renameProcessing}
                            >
                                Отмена
                            </Button>
                            <Button type="submit" disabled={renameProcessing || !renameData.name.trim()}>
                                {renameProcessing ? 'Сохранение…' : 'Сохранить'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Create subfolder dialog */}
            <Dialog
                open={showCreate}
                onOpenChange={(open) => {
                    if (!open) clearErrors();
                    setShowCreate(open);
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Новая подпапка в «{folder.name}»</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="subfolder-name">Название подпапки</Label>
                            <Input
                                id="subfolder-name"
                                placeholder="напр. 2024"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                autoFocus
                            />
                            {errors.name && (
                                <p className="text-xs text-destructive">{errors.name}</p>
                            )}
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowCreate(false)}
                                disabled={processing}
                            >
                                Отмена
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Создание…' : 'Создать'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
