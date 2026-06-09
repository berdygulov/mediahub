import { Head, Link, router } from '@inertiajs/react';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import type { ColumnDef } from '@tanstack/react-table';
import { format, parseISO } from 'date-fns';
import {
    ArrowLeft,
    Film,
    Folder,
    FolderOpen,
    Music,
    Plus,
    Shield,
    User,
    X,
} from 'lucide-react';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { buildTree, FolderNodeItem } from '@/components/folder-node-item';
import { cn, formatBytes } from '@/lib/utils';
import { dashboard } from '@/routes';
import * as adminFolderAccessesRoute from '@/routes/admin/folder-accesses';
import * as adminUsersRoute from '@/routes/admin/users';
import * as filesRoute from '@/routes/files';
import * as foldersRoute from '@/routes/folders';

interface UserRecord {
    id: number;
    name: string;
    username: string | null;
    email: string;
    is_admin: boolean;
    created_at: string;
}

interface FolderRecord {
    id: number;
    name: string;
    parent_id: number | null;
}

interface FileRecord {
    id: number;
    name: string;
    type: 'video' | 'audio';
    mime_type: string;
    size: number;
    folder: { id: number; name: string } | null;
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
    from: number | null;
    to: number | null;
    total: number;
    links: PaginationLink[];
}

interface Props {
    user: UserRecord;
    accessibleFolders: FolderRecord[];
    files: PaginatedFiles;
    allFolders: FolderRecord[];
}

function decodePaginationLabel(label: string): string {
    return label.replace('&laquo;', '«').replace('&raquo;', '»');
}

export default function AdminUserShow({ user, accessibleFolders, files, allFolders }: Props) {
    const [addFolderOpen, setAddFolderOpen] = React.useState(false);
    const [isRevoking, setIsRevoking] = React.useState<number | null>(null);
    const [isGranting, setIsGranting] = React.useState<number | null>(null);

    const grantedFolderIds = React.useMemo(
        () => new Set(accessibleFolders.map((f) => f.id)),
        [accessibleFolders],
    );

    const folderTree = React.useMemo(() => buildTree(allFolders), [allFolders]);

    const allFolderIds = React.useMemo(() => new Set(allFolders.map((f) => f.id)), [allFolders]);

    function handleRevokeAccess(folderId: number) {
        setIsRevoking(folderId);
        router.delete(adminFolderAccessesRoute.destroy({ folderId, userId: user.id }).url, {
            preserveScroll: true,
            onFinish: () => setIsRevoking(null),
        });
    }

    function handleGrantAccess(folderId: number) {
        setIsGranting(folderId);
        router.post(
            adminFolderAccessesRoute.store(folderId).url,
            { user_id: user.id },
            {
                preserveScroll: true,
                onSuccess: () => setAddFolderOpen(false),
                onFinish: () => setIsGranting(null),
            },
        );
    }

    const columns: ColumnDef<FileRecord>[] = [
        {
            accessorKey: 'name',
            header: 'Название',
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
            accessorKey: 'size',
            header: 'Размер',
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
                        className="text-primary inline-flex items-center gap-1 text-sm hover:underline"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Folder className="size-3.5 shrink-0" />
                        <span className="max-w-[200px] truncate">{row.original.folder.name}</span>
                    </Link>
                ) : (
                    <span className="text-muted-foreground/40 text-sm">—</span>
                ),
        },
        {
            accessorKey: 'created_at',
            header: 'Загружен',
            cell: ({ row }) => (
                <span className="text-muted-foreground whitespace-nowrap text-sm">
                    {format(parseISO(row.original.created_at), 'dd.MM.yyyy HH:mm')}
                </span>
            ),
        },
    ];

    const table = useReactTable({
        data: files.data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <>
            <Head title={user.name} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 lg:p-6">
                <Link
                    href={adminUsersRoute.index().url}
                    className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1.5 text-sm"
                >
                    <ArrowLeft className="size-3.5" />
                    Назад к пользователям
                </Link>

                {/* Profile card */}
                <Card>
                    <CardContent>
                        <div className="flex items-start gap-4">
                            <div className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-full">
                                <User className="text-muted-foreground size-6" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-base font-semibold">{user.name}</span>
                                    {user.is_admin ? (
                                        <Badge variant="secondary" className="gap-1">
                                            <Shield className="size-3" />
                                            Администратор
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline">Пользователь</Badge>
                                    )}
                                </div>
                                {user.username && (
                                    <span className="text-muted-foreground font-mono text-sm">
                                            @{user.username}
                                        </span>
                                )}
                                <span className="text-muted-foreground text-sm">
                                        {user.email}
                                    </span>
                                <span className="text-muted-foreground text-xs">
                                        Зарегистрирован:{' '}
                                    {format(parseISO(user.created_at), 'dd.MM.yyyy')}
                                    </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Folder access card */}
                <Card>
                    <CardHeader className="flex flex-wrap gap-2 flex-row items-center justify-between">
                        <CardTitle className="text-sm font-medium">Доступные папки</CardTitle>
                        {!user.is_admin && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 gap-1 text-xs"
                                onClick={() => setAddFolderOpen(true)}
                            >
                                <Plus className="size-3" />
                                Добавить
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent>
                        {user.is_admin ? (
                            <p className="text-muted-foreground text-sm">
                                Администратор имеет доступ ко всем папкам.
                            </p>
                        ) : accessibleFolders.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-6 text-center">
                                <div className="bg-muted flex size-10 items-center justify-center rounded-full">
                                    <FolderOpen className="text-muted-foreground size-5" />
                                </div>
                                <p className="text-muted-foreground text-sm">
                                    Нет доступных папок
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {accessibleFolders.map((folder) => (
                                    <Badge
                                        key={folder.id}
                                        variant="secondary"
                                        className="[&>svg]:size-4 gap-2 px-2 py-0.5"
                                    >
                                        <Folder className="shrink-0"/>
                                        <span>{folder.name}</span>
                                        <button
                                            type="button"
                                            disabled={isRevoking === folder.id}
                                            onClick={() => handleRevokeAccess(folder.id)}
                                            className={cn(
                                                'mb-1 rounded-sm p-1 transition-colors hover:bg-destructive/20 hover:text-destructive',
                                                isRevoking === folder.id && 'opacity-50',
                                            )}
                                            title="Отозвать доступ"
                                        >
                                            <X className="size-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Files card */}
                <Card className="flex flex-1 flex-col">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">
                            Файлы из доступных папок
                            {files.total > 0 && (
                                <span className="text-muted-foreground ml-2 font-normal">
                                    {files.total}
                                </span>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 p-0">
                        {files.data.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                                <div className="bg-muted flex size-10 items-center justify-center rounded-full">
                                    <Film className="text-muted-foreground size-5" />
                                </div>
                                <p className="text-muted-foreground text-sm">
                                    {user.is_admin
                                        ? 'Администратор имеет доступ ко всем файлам'
                                        : accessibleFolders.length === 0
                                          ? 'Нет доступных папок — файлы не отображаются'
                                          : 'В доступных папках нет файлов'}
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Mobile */}
                                <div className="divide-y md:hidden">
                                    {files.data.map((file) => (
                                        <div
                                            key={file.id}
                                            className="hover:bg-muted/30 flex cursor-pointer flex-col gap-1.5 px-4 py-3 transition-colors"
                                            onClick={() =>
                                                router.visit(filesRoute.show(file.id).url)
                                            }
                                        >
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
                                            <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 pl-6 text-xs">
                                                <span>{formatBytes(file.size)}</span>
                                                {file.folder && (
                                                    <span className="inline-flex items-center gap-1">
                                                        <Folder className="size-3 shrink-0" />
                                                        {file.folder.name}
                                                    </span>
                                                )}
                                                <span>
                                                    {format(
                                                        parseISO(file.created_at),
                                                        'dd.MM.yyyy',
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Desktop */}
                                <div className="hidden overflow-x-auto md:block">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50 border-b">
                                            {table.getHeaderGroups().map((headerGroup) => (
                                                <tr key={headerGroup.id}>
                                                    {headerGroup.headers.map((header) => (
                                                        <th
                                                            key={header.id}
                                                            className="text-muted-foreground px-6 py-2.5 text-left text-xs font-medium "
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
                                                        router.visit(
                                                            filesRoute.show(row.original.id).url,
                                                        )
                                                    }
                                                >
                                                    {row.getVisibleCells().map((cell) => (
                                                        <td key={cell.id} className="py-3 px-6">
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

                                {/* Pagination */}
                                {files.last_page > 1 && (
                                    <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-y-2 px-4 md:px-6 py-3 text-sm">
                                        <span>
                                            {files.from}–{files.to} из {files.total} файлов
                                        </span>
                                        <div className="flex flex-wrap items-center gap-1">
                                            {files.links.map((link, i) =>
                                                link.url ? (
                                                    <Link
                                                        key={i}
                                                        href={link.url}
                                                        preserveScroll
                                                        className={cn(
                                                            'rounded px-2.5 py-1 text-xs transition-colors',
                                                            link.active
                                                                ? 'bg-primary text-primary-foreground'
                                                                : 'hover:bg-muted',
                                                        )}
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
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Add folder access dialog */}
            <Dialog open={addFolderOpen} onOpenChange={setAddFolderOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Добавить доступ к папке</DialogTitle>
                        <DialogDescription>
                            Выберите папку для пользователя{' '}
                            <span className="text-foreground font-medium">{user.name}</span>.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="max-h-64 overflow-y-auto">
                        {folderTree.length === 0 ? (
                            <p className="text-muted-foreground py-6 text-center text-sm">
                                Папок пока нет
                            </p>
                        ) : (
                            <div className="flex flex-col gap-0.5">
                                {folderTree.map((node) => (
                                    <FolderNodeItem
                                        key={node.id}
                                        node={node}
                                        selectedId={null}
                                        onSelect={(id) => id !== null && handleGrantAccess(id)}
                                        openIds={allFolderIds}
                                        disabledIds={grantedFolderIds}
                                        loadingId={isGranting}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    <Separator />

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddFolderOpen(false)}>
                            Закрыть
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

AdminUserShow.layout = {
    breadcrumbs: [
        { title: 'Главная', href: dashboard() },
        { title: 'Пользователи', href: adminUsersRoute.index() },
        { title: 'Профиль', href: '#' },
    ],
};
