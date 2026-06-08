import { Head, Link, router, usePage } from '@inertiajs/react';
import { flexRender, getCoreRowModel, getExpandedRowModel, useReactTable } from '@tanstack/react-table';
import type { ColumnDef, ExpandedState } from '@tanstack/react-table';
import { format, parseISO } from 'date-fns';
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    Check,
    ChevronDown,
    ChevronRight,
    Download,
    Eye,
    Film,
    Folder,
    FolderInput,
    Music,
    Play,
    Trash2,
    Upload,
} from 'lucide-react';
import * as React from 'react';
import type { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { buildTree, FlatFolder, FolderNodeItem, getAncestorIds } from '@/components/folder-node-item';
import { useMediaPlayer } from '@/contexts/media-player-context';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatBytes } from '@/lib/utils';
import { dashboard } from '@/routes';
import * as filesRoute from '@/routes/files';
import * as foldersRoute from '@/routes/folders';
import * as uploadRoute from '@/routes/upload';

interface FileFolder {
    id: number;
    name: string;
    path: string;
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
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedFiles {
    data: FileRecord[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: PaginationLink[];
}

interface Filters {
    search: string;
    type: string;
    from: string;
    to: string;
    sort: string;
    order: string;
    owner_id: string;
}

interface UserOption {
    id: number;
    name: string;
}

interface Props {
    files: PaginatedFiles;
    filters: Filters;
    users: UserOption[];
}

function decodePaginationLabel(label: string): string {
    return label.replace('&laquo;', '«').replace('&raquo;', '»');
}

function SortIcon({ column, sort, order }: { column: string; sort: string; order: string }) {
    if (sort !== column) {
        return <ArrowUpDown className="ml-1 inline size-3 opacity-40" />;
    }

    return order === 'asc' ? (
        <ArrowUp className="ml-1 inline size-3" />
    ) : (
        <ArrowDown className="ml-1 inline size-3" />
    );
}

export default function FilesIndex({ files, filters, users }: Props) {
    const { auth } = usePage().props;
    const isAdmin = auth.user.is_admin;
    const { play } = useMediaPlayer();

    const [search, setSearch] = React.useState(filters.search);
    const [typeFilter, setTypeFilter] = React.useState(filters.type || 'all');
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>(
        filters.from
            ? {
                  from: new Date(filters.from),
                  to: filters.to ? new Date(filters.to) : undefined,
              }
            : undefined,
    );
    const [ownerFilter, setOwnerFilter] = React.useState(filters.owner_id || '');
    const [ownerOpen, setOwnerOpen] = React.useState(false);
    const [ownerSearch, setOwnerSearch] = React.useState('');

    const [fileToDelete, setFileToDelete] = React.useState<FileRecord | null>(null);
    const [isDeleting, setIsDeleting] = React.useState(false);

    const [fileToMove, setFileToMove] = React.useState<FileRecord | null>(null);
    const [foldersList, setFoldersList] = React.useState<FlatFolder[]>([]);
    const [foldersLoading, setFoldersLoading] = React.useState(false);
    const [selectedFolderId, setSelectedFolderId] = React.useState<number | null>(null);
    const [isMoving, setIsMoving] = React.useState(false);

    const searchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const searchRef = React.useRef(search);
    const typeFilterRef = React.useRef(typeFilter);
    const dateRangeRef = React.useRef(dateRange);
    const ownerFilterRef = React.useRef(ownerFilter);
    searchRef.current = search;
    typeFilterRef.current = typeFilter;
    dateRangeRef.current = dateRange;
    ownerFilterRef.current = ownerFilter;

    const filteredUsers = React.useMemo(
        () => users.filter((u) => u.name.toLowerCase().includes(ownerSearch.toLowerCase())),
        [users, ownerSearch],
    );

    const selectedOwner = React.useMemo(
        () => users.find((u) => String(u.id) === ownerFilter) ?? null,
        [users, ownerFilter],
    );

    React.useEffect(() => {
        if (!fileToMove) {
            return;
        }

        setSelectedFolderId(fileToMove.folder?.id ?? null);
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

    function navigate(overrides: Record<string, string | undefined> = {}) {
        const range = dateRangeRef.current;
        const params: Record<string, string | undefined> = {
            search: searchRef.current || undefined,
            type: typeFilterRef.current !== 'all' ? typeFilterRef.current : undefined,
            from: range?.from ? format(range.from, 'yyyy-MM-dd') : undefined,
            to: range?.to ? format(range.to, 'yyyy-MM-dd') : undefined,
            sort: filters.sort,
            order: filters.order,
            owner_id: ownerFilterRef.current || undefined,
            ...overrides,
        };
        router.get(filesRoute.index.url(), params, { preserveState: true, replace: true });
    }

    function cancelPendingSearch() {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
            searchTimeoutRef.current = null;
        }
    }

    function handleSearchChange(value: string) {
        setSearch(value);
        searchRef.current = value;
        cancelPendingSearch();
        searchTimeoutRef.current = setTimeout(() => navigate({ search: value || undefined }), 350);
    }

    function handleTypeChange(value: string) {
        cancelPendingSearch();
        setTypeFilter(value);
        typeFilterRef.current = value;
        navigate({ type: value !== 'all' ? value : undefined });
    }

    function handleOwnerChange(userId: string) {
        cancelPendingSearch();
        setOwnerFilter(userId);
        ownerFilterRef.current = userId;
        setOwnerOpen(false);
        setOwnerSearch('');
        navigate({ owner_id: userId || undefined });
    }

    function handleDateRangeChange(range: DateRange | undefined) {
        setDateRange(range);
        dateRangeRef.current = range;

        if (!range || range.to) {
            cancelPendingSearch();
            navigate({
                from: range?.from ? format(range.from, 'yyyy-MM-dd') : undefined,
                to: range?.to ? format(range.to, 'yyyy-MM-dd') : undefined,
            });
        }
    }

    function handleSort(column: string) {
        const newOrder = filters.sort === column && filters.order === 'asc' ? 'desc' : 'asc';
        navigate({ sort: column, order: newOrder });
    }

    function clearFilters() {
        cancelPendingSearch();
        setSearch('');
        setTypeFilter('all');
        setDateRange(undefined);
        setOwnerFilter('');
        setOwnerSearch('');
        searchRef.current = '';
        typeFilterRef.current = 'all';
        dateRangeRef.current = undefined;
        ownerFilterRef.current = '';
        router.get(filesRoute.index.url(), {}, { preserveState: true, replace: true });
    }

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

    const [expanded, setExpanded] = React.useState<ExpandedState>({});

    const folderTree = React.useMemo(() => buildTree(foldersList), [foldersList]);
    const ancestorIds = React.useMemo(
        () => getAncestorIds(foldersList, fileToMove?.folder?.id ?? null),
        [foldersList, fileToMove],
    );

    const isMoveUnchanged = selectedFolderId === (fileToMove?.folder?.id ?? null);

    const columns: ColumnDef<FileRecord>[] = [
        {
            accessorKey: 'name',
            header: () => (
                <button
                    className="flex cursor-pointer items-center hover:text-foreground"
                    onClick={() => handleSort('name')}
                >
                    Название <SortIcon column="name" sort={filters.sort} order={filters.order} />
                </button>
            ),
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    {row.original.type === 'video' ? (
                        <Film className="size-4 shrink-0 text-blue-500" />
                    ) : (
                        <Music className="size-4 shrink-0 text-purple-500" />
                    )}
                    <span className="max-w-[240px] truncate font-medium">{row.original.name}</span>
                </div>
            ),
        },
        {
            accessorKey: 'description',
            header: 'Описание',
            cell: ({ row }) => {
                if (!row.original.description) {
                    return <span className="text-muted-foreground/40 text-sm">—</span>;
                }
                return (
                    <button
                        className="flex max-w-[220px] items-center gap-1 text-left"
                        onClick={(e) => { e.stopPropagation(); row.toggleExpanded(); }}
                    >
                        <span className="text-muted-foreground truncate text-sm">
                            {row.original.description}
                        </span>
                        {row.getIsExpanded()
                            ? <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
                            : <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                        }
                    </button>
                );
            },
        },
        {
            accessorKey: 'mime_type',
            header: () => (
                <button
                    className="flex cursor-pointer items-center hover:text-foreground"
                    onClick={() => handleSort('mime_type')}
                >
                    Тип <SortIcon column="mime_type" sort={filters.sort} order={filters.order} />
                </button>
            ),
            cell: ({ row }) => (
                <span className="text-muted-foreground text-xs">{row.original.mime_type}</span>
            ),
        },
        {
            accessorKey: 'size',
            header: () => (
                <button
                    className="flex cursor-pointer items-center hover:text-foreground"
                    onClick={() => handleSort('size')}
                >
                    Размер <SortIcon column="size" sort={filters.sort} order={filters.order} />
                </button>
            ),
            cell: ({ row }) => (
                <span className="text-muted-foreground">{formatBytes(row.original.size)}</span>
            ),
        },
        {
            id: 'folder',
            header: 'Папка',
            cell: ({ row }) =>
                row.original.folder ? (
                    <Link
                        href={foldersRoute.show(row.original.folder.id).url}
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        title={row.original.folder.path}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Folder className="size-3.5 shrink-0" />
                        <span className="max-w-[200px] truncate">
                            {row.original.folder.path.split(' / ').slice(-2).join(' / ')}
                        </span>
                    </Link>
                ) : (
                    <span className="text-muted-foreground/40 text-sm">—</span>
                ),
        },
        ...(isAdmin
            ? [
                  {
                      id: 'owner',
                      header: 'Владелец',
                      cell: ({ row }: { row: { original: FileRecord } }) => (
                          <span className="text-muted-foreground text-sm">{row.original.user.name}</span>
                      ),
                  } as ColumnDef<FileRecord>,
              ]
            : []),
        {
            accessorKey: 'created_at',
            header: () => (
                <button
                    className="flex cursor-pointer items-center hover:text-foreground"
                    onClick={() => handleSort('created_at')}
                >
                    Загружен <SortIcon column="created_at" sort={filters.sort} order={filters.order} />
                </button>
            ),
            cell: ({ row }) => (
                <span className="text-muted-foreground whitespace-nowrap text-sm">
                    {format(parseISO(row.original.created_at), 'dd.MM.yyyy HH:mm')}
                </span>
            ),
        },
        {
            id: 'actions',
            header: '',
            cell: ({ row }) => (
                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        title="Воспроизвести"
                        onClick={() =>
                            play({
                                id: row.original.id,
                                name: row.original.name,
                                description: row.original.description,
                                type: row.original.type,
                                mime_type: row.original.mime_type,
                                size: row.original.size,
                                created_at: row.original.created_at,
                                folder: row.original.folder,
                                streamUrl: filesRoute.stream(row.original.id).url,
                            })
                        }
                    >
                        <Play className="size-3.5" />
                    </Button>
                    <Link href={filesRoute.show(row.original.id).url}>
                        <Button variant="ghost" size="icon" className="size-7" title="Просмотр">
                            <Eye className="size-3.5" />
                        </Button>
                    </Link>
                    {isAdmin && (
                        <a href={filesRoute.download(row.original.id).url}>
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
                            onClick={() => setFileToMove(row.original)}
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
                            onClick={() => setFileToDelete(row.original)}
                        >
                            <Trash2 className="size-3.5" />
                        </Button>
                    )}
                </div>
            ),
        },
    ];

    const table = useReactTable({
        data: files.data,
        columns,
        state: { expanded },
        onExpandedChange: setExpanded,
        getRowCanExpand: (row) => Boolean(row.original.description),
        getCoreRowModel: getCoreRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
        manualSorting: true,
    });

    const hasActiveFilters = Boolean(search || typeFilter !== 'all' || dateRange || ownerFilter);

    return (
        <>
            <Head title="Файлы" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4 lg:p-6">
                {/* Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <Input
                            placeholder="Поиск файлов…"
                            value={search}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="h-8 w-52"
                        />
                        <Select value={typeFilter} onValueChange={handleTypeChange}>
                            <SelectTrigger size="sm" className="w-32">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Все типы</SelectItem>
                                <SelectItem value="video">
                                    <span className="flex items-center gap-1.5">
                                        <Film className="size-3.5 text-blue-500" />
                                        Видео
                                    </span>
                                </SelectItem>
                                <SelectItem value="audio">
                                    <span className="flex items-center gap-1.5">
                                        <Music className="size-3.5 text-purple-500" />
                                        Аудио
                                    </span>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <DateRangePicker
                            value={dateRange}
                            onChange={handleDateRangeChange}
                            className="h-8 text-sm"
                            placeholder="Период"
                        />
                        {isAdmin && (
                            <Popover open={ownerOpen} onOpenChange={setOwnerOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 w-44 justify-between font-normal"
                                    >
                                        <span className="truncate">
                                            {selectedOwner ? selectedOwner.name : 'Все пользователи'}
                                        </span>
                                        <ChevronDown className="ml-1 size-3 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-52 p-1" align="start">
                                    <Input
                                        placeholder="Поиск…"
                                        value={ownerSearch}
                                        onChange={(e) => setOwnerSearch(e.target.value)}
                                        className="mb-1 h-7 text-sm"
                                    />
                                    <div className="max-h-52 overflow-y-auto">
                                        <button
                                            type="button"
                                            className={cn(
                                                'flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors hover:bg-accent',
                                                !ownerFilter && 'bg-accent font-medium',
                                            )}
                                            onClick={() => handleOwnerChange('')}
                                        >
                                            <Check className={cn('size-3.5 shrink-0', ownerFilter ? 'opacity-0' : '')} />
                                            Все пользователи
                                        </button>
                                        {filteredUsers.map((u) => (
                                            <button
                                                key={u.id}
                                                type="button"
                                                className={cn(
                                                    'flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors hover:bg-accent',
                                                    ownerFilter === String(u.id) && 'bg-accent font-medium',
                                                )}
                                                onClick={() => handleOwnerChange(String(u.id))}
                                            >
                                                <Check className={cn('size-3.5 shrink-0', ownerFilter === String(u.id) ? '' : 'opacity-0')} />
                                                {u.name}
                                            </button>
                                        ))}
                                        {filteredUsers.length === 0 && (
                                            <p className="text-muted-foreground px-2 py-3 text-center text-xs">
                                                Ничего не найдено
                                            </p>
                                        )}
                                    </div>
                                </PopoverContent>
                            </Popover>
                        )}
                        {hasActiveFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground h-8 px-2 text-xs"
                                onClick={clearFilters}
                            >
                                Сбросить фильтры
                            </Button>
                        )}
                    </div>
                    {isAdmin && (
                        <Link href={uploadRoute.create.url()}>
                            <Button size="sm" className="h-8 gap-1.5">
                                <Upload className="size-3.5" />
                                Загрузить
                            </Button>
                        </Link>
                    )}
                </div>

                {/* Table */}
                <div className="rounded-xl border overflow-hidden">
                    {files.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
                            <div className="bg-muted flex size-12 items-center justify-center rounded-full">
                                <Film className="text-muted-foreground size-5" />
                            </div>
                            <p className="text-sm font-medium">Файлы не найдены</p>
                            <p className="text-muted-foreground text-xs">
                                {hasActiveFilters
                                    ? 'Попробуйте изменить фильтры'
                                    : isAdmin
                                      ? 'Загрузите первый файл чтобы начать'
                                      : 'Файлы ещё не загружены'}
                            </p>
                            {!hasActiveFilters && isAdmin && (
                                <Link
                                    href={uploadRoute.create.url()}
                                    className="text-primary text-xs underline underline-offset-4"
                                >
                                    Загрузить файл
                                </Link>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Mobile: card list */}
                            <div className="divide-y md:hidden">
                                {files.data.map((file) => (
                                    <div
                                        key={file.id}
                                        className="flex flex-col gap-2 px-4 py-3 cursor-pointer"
                                        onClick={() => router.visit(filesRoute.show(file.id).url)}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex min-w-0 items-center gap-2">
                                                {file.type === 'video' ? (
                                                    <Film className="size-4 shrink-0 text-blue-500" />
                                                ) : (
                                                    <Music className="size-4 shrink-0 text-purple-500" />
                                                )}
                                                <span className="truncate text-sm font-medium">{file.name}</span>
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
                                                            description: file.description,
                                                            type: file.type,
                                                            mime_type: file.mime_type,
                                                            size: file.size,
                                                            created_at: file.created_at,
                                                            folder: file.folder,
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
                                                {isAdmin && (
                                                    <a href={filesRoute.download(file.id).url}>
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
                                                        onClick={() => setFileToMove(file)}
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
                                                        onClick={() => setFileToDelete(file)}
                                                    >
                                                        <Trash2 className="size-3.5" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-6 text-xs text-muted-foreground">
                                            <span>{file.mime_type}</span>
                                            <span>{formatBytes(file.size)}</span>
                                            {file.description && (
                                                <span className="max-w-[200px] truncate">{file.description}</span>
                                            )}
                                            {file.folder && (
                                                <Link
                                                    href={foldersRoute.show(file.folder.id).url}
                                                    className="inline-flex items-center gap-1 text-primary hover:underline"
                                                    title={file.folder.path}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Folder className="size-3 shrink-0" />
                                                    <span className="max-w-[160px] truncate">
                                                        {file.folder.path.split(' / ').slice(-2).join(' / ')}
                                                    </span>
                                                </Link>
                                            )}
                                            {isAdmin && <span>{file.user.name}</span>}
                                            <span className="whitespace-nowrap">
                                                {format(parseISO(file.created_at), 'dd.MM.yyyy HH:mm')}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {/* Desktop: table */}
                            <div className="overflow-x-auto">
                            <table className="hidden w-full text-sm md:table">
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
                                    {table.getRowModel().rows.map((row) => (
                                        <React.Fragment key={row.id}>
                                            <tr
                                                className="hover:bg-muted/30 border-b transition-colors cursor-pointer"
                                                onClick={() => router.visit(filesRoute.show(row.original.id).url)}
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
                                    ))}
                                </tbody>
                            </table>
                            </div>
                        </>
                    )}
                </div>

                {/* Pagination */}
                {files.last_page > 1 && (
                    <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-y-2 text-sm">
                        <span>
                            {files.from}–{files.to} из {files.total} файлов
                        </span>
                        <div className="flex flex-wrap items-center gap-1">
                            {files.links.map((link, i) =>
                                link.url ? (
                                    <Link
                                        key={i}
                                        href={link.url}
                                        preserveState
                                        className={`rounded px-2.5 py-1 text-xs transition-colors ${
                                            link.active
                                                ? 'bg-primary text-primary-foreground'
                                                : 'hover:bg-muted'
                                        }`}
                                    >
                                        {decodePaginationLabel(link.label)}
                                    </Link>
                                ) : (
                                    <span
                                        key={i}
                                        className="cursor-default rounded px-2.5 py-1 text-xs opacity-40"
                                    >
                                        {decodePaginationLabel(link.label)}
                                    </span>
                                ),
                            )}
                        </div>
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
                        {/* No folder option */}
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

                        {/* Folder tree */}
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
                        <Button onClick={handleMoveFolder} disabled={isMoving || isMoveUnchanged}>
                            {isMoving ? 'Перемещение…' : 'Переместить'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

FilesIndex.layout = {
    breadcrumbs: [
        { title: 'Главная', href: dashboard() },
        { title: 'Файлы', href: filesRoute.index() },
    ],
};
