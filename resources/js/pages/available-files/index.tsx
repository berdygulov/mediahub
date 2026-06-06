import { Head, Link, router } from '@inertiajs/react';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import type { ColumnDef } from '@tanstack/react-table';
import { format, parseISO } from 'date-fns';
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, Film, Folder, Music, Play } from 'lucide-react';
import * as React from 'react';
import type { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMediaPlayer } from '@/contexts/media-player-context';
import { formatBytes } from '@/lib/utils';
import { dashboard } from '@/routes';
import * as availableFilesRoute from '@/routes/available-files';
import * as filesRoute from '@/routes/files';
import * as foldersRoute from '@/routes/folders';

interface FileFolder {
    id: number;
    name: string;
    path: string;
}

interface FileRecord {
    id: number;
    name: string;
    mime_type: string;
    type: 'video' | 'audio';
    size: number;
    folder: FileFolder | null;
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
}

interface Props {
    files: PaginatedFiles;
    filters: Filters;
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

export default function AvailableFilesIndex({ files, filters }: Props) {
    const { play } = useMediaPlayer();

    const [search, setSearch] = React.useState(filters.search);
    const [typeFilter, setTypeFilter] = React.useState(filters.type || 'all');
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>(
        filters.from
            ? { from: new Date(filters.from), to: filters.to ? new Date(filters.to) : undefined }
            : undefined,
    );

    const searchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const searchRef = React.useRef(search);
    const typeFilterRef = React.useRef(typeFilter);
    const dateRangeRef = React.useRef(dateRange);
    searchRef.current = search;
    typeFilterRef.current = typeFilter;
    dateRangeRef.current = dateRange;

    function navigate(overrides: Record<string, string | undefined> = {}) {
        const range = dateRangeRef.current;
        const params: Record<string, string | undefined> = {
            search: searchRef.current || undefined,
            type: typeFilterRef.current !== 'all' ? typeFilterRef.current : undefined,
            from: range?.from ? format(range.from, 'yyyy-MM-dd') : undefined,
            to: range?.to ? format(range.to, 'yyyy-MM-dd') : undefined,
            sort: filters.sort,
            order: filters.order,
            ...overrides,
        };
        router.get(availableFilesRoute.index.url(), params, { preserveState: true, replace: true });
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
        searchRef.current = '';
        typeFilterRef.current = 'all';
        dateRangeRef.current = undefined;
        router.get(availableFilesRoute.index.url(), {}, { preserveState: true, replace: true });
    }

    const hasActiveFilters = Boolean(search || typeFilter !== 'all' || dateRange);

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
        {
            accessorKey: 'created_at',
            header: () => (
                <button
                    className="flex cursor-pointer items-center hover:text-foreground"
                    onClick={() => handleSort('created_at')}
                >
                    Загружен{' '}
                    <SortIcon column="created_at" sort={filters.sort} order={filters.order} />
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
                <div
                    className="flex items-center justify-end gap-1"
                    onClick={(e) => e.stopPropagation()}
                >
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        title="Воспроизвести"
                        onClick={() =>
                            play({
                                id: row.original.id,
                                name: row.original.name,
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
                </div>
            ),
        },
    ];

    const table = useReactTable({
        data: files.data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        manualSorting: true,
    });

    return (
        <>
            <Head title="Доступные файлы" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4 lg:p-6">
                {/* Toolbar */}
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

                {/* Table */}
                <div className="overflow-hidden rounded-xl border">
                    {files.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
                            <div className="bg-muted flex size-12 items-center justify-center rounded-full">
                                <Film className="text-muted-foreground size-5" />
                            </div>
                            <p className="text-sm font-medium">Файлы не найдены</p>
                            <p className="text-muted-foreground text-xs">
                                {hasActiveFilters
                                    ? 'Попробуйте изменить фильтры'
                                    : 'Администратор ещё не выдал вам доступ к файлам'}
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Mobile: card list */}
                            <div className="divide-y md:hidden">
                                {files.data.map((file) => (
                                    <div
                                        key={file.id}
                                        className="flex flex-col gap-2 cursor-pointer px-4 py-3"
                                        onClick={() => router.visit(filesRoute.show(file.id).url)}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex min-w-0 items-center gap-2">
                                                {file.type === 'video' ? (
                                                    <Film className="size-4 shrink-0 text-blue-500" />
                                                ) : (
                                                    <Music className="size-4 shrink-0 text-purple-500" />
                                                )}
                                                <span className="truncate text-sm font-medium">
                                                    {file.name}
                                                </span>
                                            </div>
                                            <div
                                                className="flex shrink-0 items-center gap-0.5"
                                                onClick={(e) => e.stopPropagation()}
                                            >
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
                                                            folder: file.folder,
                                                            streamUrl: filesRoute.stream(file.id).url,
                                                        })
                                                    }
                                                >
                                                    <Play className="size-3.5" />
                                                </Button>
                                                <Link href={filesRoute.show(file.id).url}>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-7"
                                                        title="Просмотр"
                                                    >
                                                        <Eye className="size-3.5" />
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-6 text-xs text-muted-foreground">
                                            <span>{file.mime_type}</span>
                                            <span>{formatBytes(file.size)}</span>
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
                                            <tr
                                                key={row.id}
                                                className="hover:bg-muted/30 cursor-pointer border-b transition-colors last:border-0"
                                                onClick={() =>
                                                    router.visit(filesRoute.show(row.original.id).url)
                                                }
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
        </>
    );
}

AvailableFilesIndex.layout = {
    breadcrumbs: [
        { title: 'Главная', href: dashboard() },
        { title: 'Доступные файлы', href: availableFilesRoute.index() },
    ],
};
