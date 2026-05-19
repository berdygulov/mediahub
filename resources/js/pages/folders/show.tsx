import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { Head, router, setLayoutProps, useForm } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    Film,
    Folder,
    FolderPlus,
    Music,
} from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { formatBytes } from '@/lib/utils';
import { dashboard } from '@/routes';
import * as filesRoute from '@/routes/files';
import * as foldersRoute from '@/routes/folders';

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
    type: 'video' | 'audio';
    mime_type: string;
    size: number;
    created_at: string;
}

interface AncestorItem {
    id: number;
    name: string;
}

interface Props {
    folder: FolderItem;
    subfolders: FolderItem[];
    files: FileItem[];
    ancestors: AncestorItem[];
}

interface TableRow {
    kind: 'folder' | 'file';
    id: number;
    name: string;
    created_at: string;
    displayType: string;
    size: number | null;
    media_type: 'video' | 'audio' | null;
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

export default function FoldersShow({ folder, subfolders, files, ancestors }: Props) {
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

    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

    const rows = React.useMemo<TableRow[]>(
        () => [
            ...subfolders.map(
                (f): TableRow => ({
                    kind: 'folder',
                    id: f.id,
                    name: f.name,
                    created_at: f.created_at,
                    displayType: 'Папка',
                    size: null,
                    media_type: null,
                    href: foldersRoute.show(f.id).url,
                }),
            ),
            ...files.map(
                (f): TableRow => ({
                    kind: 'file',
                    id: f.id,
                    name: f.name,
                    created_at: f.created_at,
                    displayType: f.mime_type,
                    size: f.size,
                    media_type: f.type,
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
                header: 'Тип',
                enableSorting: false,
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
        ],
        [],
    );

    const table = useReactTable({
        data: rows,
        columns,
        state: {
            sorting,
            columnFilters,
            columnVisibility: { kind: false },
        },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
    });

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
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                            <Folder className="size-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold">{folder.name}</h1>
                            <p className="text-xs text-muted-foreground">{folderMeta(folder)}</p>
                        </div>
                    </div>
                    <Button size="sm" className="h-8 gap-1.5" onClick={openCreate}>
                        <FolderPlus className="size-3.5" />
                        Новая подпапка
                    </Button>
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

                {/* Table */}
                <div className="rounded-xl border overflow-hidden">
                    {rows.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
                            <div className="bg-muted flex size-12 items-center justify-center rounded-full">
                                <Folder className="text-muted-foreground size-5" />
                            </div>
                            <p className="text-sm font-medium">Папка пуста</p>
                            <button
                                className="text-primary text-xs underline underline-offset-4"
                                onClick={openCreate}
                            >
                                Создать подпапку
                            </button>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
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
                                        <tr
                                            key={row.id}
                                            className="hover:bg-muted/30 border-b cursor-pointer transition-colors last:border-0"
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
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

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
