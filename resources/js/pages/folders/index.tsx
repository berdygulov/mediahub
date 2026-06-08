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
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import { ArrowDown, ArrowUp, ArrowUpDown, Folder, FolderPlus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
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
import { dashboard } from '@/routes';
import * as foldersRoute from '@/routes/folders';

interface FolderItem {
    id: number;
    name: string;
    children_count: number;
    files_count: number;
    created_at: string;
}

interface Props {
    folders: FolderItem[];
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
    return sorted === 'asc'
        ? <ArrowUp className="ml-1 inline size-3" />
        : <ArrowDown className="ml-1 inline size-3" />;
}

export default function FoldersIndex({ folders }: Props) {
    const { auth } = usePage().props;
    const isAdmin = auth.user.is_admin;

    const [showCreate, setShowCreate] = React.useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({ name: '' });

    const [folderToDelete, setFolderToDelete] = React.useState<FolderItem | null>(null);
    const [isDeletingFolder, setIsDeletingFolder] = React.useState(false);

    const [folderToRename, setFolderToRename] = React.useState<FolderItem | null>(null);
    const {
        data: renameData,
        setData: setRenameData,
        patch: renamePatch,
        processing: renameProcessing,
        errors: renameErrors,
        clearErrors: clearRenameErrors,
    } = useForm({ name: '' });

    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

    const columns = React.useMemo<ColumnDef<FolderItem>[]>(
        () => [
            {
                accessorKey: 'name',
                header: 'Название',
                filterFn: 'includesString',
                cell: ({ row }) => (
                    <div className="flex items-center gap-2">
                        <Folder className="size-4 shrink-0 text-amber-500" />
                        <span className="max-w-[300px] truncate font-medium">{row.original.name}</span>
                    </div>
                ),
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
                    <span className="whitespace-nowrap text-sm text-muted-foreground">
                        {format(parseISO(getValue() as string), 'dd.MM.yyyy HH:mm')}
                    </span>
                ),
            },
            {
                id: 'meta',
                header: 'Содержимое',
                cell: ({ row }) => (
                    <span className="text-sm text-muted-foreground">{folderMeta(row.original)}</span>
                ),
            },
            ...(isAdmin
                ? [
                      {
                          id: 'actions',
                          header: '',
                          cell: ({ row }: { row: { original: FolderItem } }) => (
                              <div
                                  className="flex items-center justify-end"
                                  onClick={(e) => e.stopPropagation()}
                              >
                                  <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon" className="size-7">
                                              <MoreHorizontal className="size-3.5" />
                                          </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                          <DropdownMenuItem
                                              onClick={() => {
                                                  clearRenameErrors();
                                                  setRenameData('name', row.original.name);
                                                  setFolderToRename(row.original);
                                              }}
                                          >
                                              <Pencil className="mr-2 size-4" />
                                              Переименовать
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem
                                              className="text-destructive focus:text-destructive"
                                              onClick={() => setFolderToDelete(row.original)}
                                          >
                                              <Trash2 className="mr-2 size-4" />
                                              Удалить
                                          </DropdownMenuItem>
                                      </DropdownMenuContent>
                                  </DropdownMenu>
                              </div>
                          ),
                      } as ColumnDef<FolderItem>,
                  ]
                : []),
        ],
        [isAdmin],
    );

    const table = useReactTable({
        data: folders,
        columns,
        state: { sorting, columnFilters },
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
                reset();
                setShowCreate(false);
            },
        });
    }

    function openCreate() {
        reset();
        setShowCreate(true);
    }

    function handleDeleteFolder() {
        if (!folderToDelete) return;
        setIsDeletingFolder(true);
        router.delete(foldersRoute.destroy(folderToDelete.id).url, {
            onFinish: () => {
                setIsDeletingFolder(false);
                setFolderToDelete(null);
            },
        });
    }

    function handleRenameFolder(e: React.FormEvent) {
        e.preventDefault();
        if (!folderToRename) return;
        renamePatch(foldersRoute.update(folderToRename.id).url, {
            onSuccess: () => {
                clearRenameErrors();
                setFolderToRename(null);
            },
        });
    }

    return (
        <>
            <Head title="Папки" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4 lg:p-6">
                {/* Toolbar */}
                <div className="flex items-center justify-between gap-3">
                    <Input
                        placeholder="Поиск папок…"
                        value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
                        onChange={(e) => table.getColumn('name')?.setFilterValue(e.target.value)}
                        className="h-8 flex-1 sm:flex-none sm:w-52"
                    />
                    {isAdmin && (
                        <Button size="sm" className="h-8 gap-1.5" onClick={openCreate}>
                            <FolderPlus className="size-3.5" />
                            Новая папка
                        </Button>
                    )}
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-xl border">
                    {folders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
                            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                                <Folder className="size-5 text-muted-foreground" />
                            </div>
                            <p className="text-sm font-medium">Папок пока нет</p>
                            <p className="text-xs text-muted-foreground">
                                {isAdmin ? 'Создайте папку для организации медиафайлов' : 'Папки пока не созданы'}
                            </p>
                            {isAdmin && (
                                <button
                                    className="mt-1 text-xs text-primary underline underline-offset-4 hover:text-primary/80"
                                    onClick={openCreate}
                                >
                                    Создать папку
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
                                    table.getRowModel().rows.map((row) => (
                                        <div
                                            key={row.id}
                                            className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
                                            onClick={() => router.visit(foldersRoute.show(row.original.id).url)}
                                        >
                                            <Folder className="size-5 shrink-0 text-amber-500" />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium">{row.original.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {folderMeta(row.original)} · {format(parseISO(row.original.created_at), 'dd.MM.yyyy')}
                                                </p>
                                            </div>
                                            {isAdmin && (
                                                <div
                                                    className="shrink-0"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="size-7">
                                                                <MoreHorizontal className="size-3.5" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem
                                                                onClick={() => {
                                                                    clearRenameErrors();
                                                                    setRenameData('name', row.original.name);
                                                                    setFolderToRename(row.original);
                                                                }}
                                                            >
                                                                <Pencil className="mr-2 size-4" />
                                                                Переименовать
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                className="text-destructive focus:text-destructive"
                                                                onClick={() => setFolderToDelete(row.original)}
                                                            >
                                                                <Trash2 className="mr-2 size-4" />
                                                                Удалить
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                            {/* Desktop: table */}
                            <div className="overflow-x-auto">
                            <table className="hidden w-full text-sm md:table">
                                <thead className="border-b bg-muted/50">
                                    {table.getHeaderGroups().map((headerGroup) => (
                                        <tr key={headerGroup.id}>
                                            {headerGroup.headers.map((header) => (
                                                <th
                                                    key={header.id}
                                                    className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground"
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
                                                colSpan={columns.length}
                                                className="px-4 py-10 text-center text-muted-foreground"
                                            >
                                                Ничего не найдено
                                            </td>
                                        </tr>
                                    ) : (
                                        table.getRowModel().rows.map((row) => (
                                            <tr
                                                key={row.id}
                                                className="cursor-pointer border-b transition-colors last:border-0 hover:bg-muted/30"
                                                onClick={() => router.visit(foldersRoute.show(row.original.id).url)}
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
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Delete folder dialog */}
            <Dialog
                open={!!folderToDelete}
                onOpenChange={(open) => !isDeletingFolder && !open && setFolderToDelete(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Удалить папку</DialogTitle>
                        <DialogDescription asChild>
                            <div className="space-y-2">
                                <p>
                                    Вы уверены, что хотите удалить папку{' '}
                                    <span className="text-foreground font-medium">«{folderToDelete?.name}»</span>?
                                </p>
                                {folderToDelete && (folderToDelete.children_count > 0 || folderToDelete.files_count > 0) ? (
                                    <p>
                                        Папка содержит{' '}
                                        {[
                                            folderToDelete.children_count > 0
                                                ? ruPlural(folderToDelete.children_count, 'подпапку', 'подпапки', 'подпапок')
                                                : null,
                                            folderToDelete.files_count > 0
                                                ? ruPlural(folderToDelete.files_count, 'файл', 'файла', 'файлов')
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
                            onClick={() => setFolderToDelete(null)}
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
                open={!!folderToRename}
                onOpenChange={(open) => {
                    if (!open) {
                        clearRenameErrors();
                        setFolderToRename(null);
                    }
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
                                onClick={() => setFolderToRename(null)}
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

            {/* Create folder dialog */}
            <Dialog
                open={showCreate}
                onOpenChange={(open) => {
                    if (!open) reset();
                    setShowCreate(open);
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Новая папка</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="folder-name">Название папки</Label>
                            <Input
                                id="folder-name"
                                placeholder="напр. Видео"
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

FoldersIndex.layout = {
    breadcrumbs: [
        { title: 'Главная', href: dashboard() },
        { title: 'Папки', href: foldersRoute.index() },
    ],
};
