import { Head, Link, router } from '@inertiajs/react';
import {
    flexRender,
    getCoreRowModel,
    useReactTable,
    type ColumnDef,
    type RowSelectionState,
} from '@tanstack/react-table';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ArrowDown, ArrowUp, ScrollText, Trash2 } from 'lucide-react';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { dashboard } from '@/routes';
import * as adminLogs from '@/routes/admin/logs';

interface UserRecord {
    id: number;
    name: string;
    email: string;
}

interface LogEntry {
    id: number;
    event: string;
    description: string;
    ip_address: string | null;
    metadata: Record<string, string | number> | null;
    created_at: string;
    user: UserRecord | null;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedLogs {
    data: LogEntry[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: PaginationLink[];
}

interface EventType {
    value: string;
    label: string;
}

interface Filters {
    event: string;
    user_id: number | '';
    order: string;
}

interface Props {
    logs: PaginatedLogs;
    filters: Filters;
    eventTypes: EventType[];
    users: UserRecord[];
}

function decodePaginationLabel(label: string): string {
    return label.replace('&laquo;', '«').replace('&raquo;', '»');
}

const eventLabels: Record<string, string> = {
    login: 'Вход',
    logout: 'Выход',
    folder_access_granted: 'Доступ выдан',
    folder_access_revoked: 'Доступ отозван',
};

const eventVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    login: 'default',
    logout: 'secondary',
    folder_access_granted: 'outline',
    folder_access_revoked: 'destructive',
};

export default function AdminLogs({ logs, filters, eventTypes, users }: Props) {
    const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

    const selectedIds = Object.keys(rowSelection).map(Number);
    const hasSelection = selectedIds.length > 0;

    function navigate(overrides: Record<string, string | number | undefined> = {}) {
        const params: Record<string, string | number | undefined> = {
            event: filters.event || undefined,
            user_id: filters.user_id || undefined,
            order: filters.order,
            ...overrides,
        };
        router.get(adminLogs.index.url(), params, { preserveState: true, replace: true });
    }

    function toggleOrder() {
        navigate({ order: filters.order === 'desc' ? 'asc' : 'desc', page: undefined });
    }

    function handleBulkDelete() {
        if (!window.confirm(`Удалить ${selectedIds.length} ${selectedIds.length === 1 ? 'запись' : 'записей'}?`)) {
            return;
        }
        router.delete(adminLogs.bulkDestroy.url(), {
            data: { ids: selectedIds },
            onSuccess: () => setRowSelection({}),
        });
    }

    const hasActiveFilters = Boolean(filters.event || filters.user_id);

    const columns: ColumnDef<LogEntry>[] = [
        {
            id: 'select',
            header: ({ table }) => (
                <Checkbox
                    checked={
                        table.getIsAllPageRowsSelected()
                            ? true
                            : table.getIsSomePageRowsSelected()
                              ? 'indeterminate'
                              : false
                    }
                    onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
                    aria-label="Выбрать все"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(v) => row.toggleSelected(!!v)}
                    aria-label="Выбрать запись"
                />
            ),
        },
        {
            accessorKey: 'created_at',
            header: () => (
                <button
                    className="flex cursor-pointer items-center gap-1 hover:text-foreground"
                    onClick={toggleOrder}
                >
                    Время
                    {filters.order === 'desc' ? (
                        <ArrowDown className="size-3" />
                    ) : (
                        <ArrowUp className="size-3" />
                    )}
                </button>
            ),
            cell: ({ row }) => (
                <span className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                    {format(parseISO(row.original.created_at), 'dd.MM.yyyy HH:mm:ss', { locale: ru })}
                </span>
            ),
        },
        {
            accessorKey: 'event',
            header: 'Событие',
            cell: ({ row }) => (
                <Badge variant={eventVariants[row.original.event] ?? 'secondary'}>
                    {eventLabels[row.original.event] ?? row.original.event}
                </Badge>
            ),
        },
        {
            accessorKey: 'user',
            header: 'Пользователь',
            cell: ({ row }) =>
                row.original.user ? (
                    <div className="flex flex-col">
                        <span className="text-sm font-medium">{row.original.user.name}</span>
                        <span className="text-xs text-muted-foreground">{row.original.user.email}</span>
                    </div>
                ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                ),
        },
        {
            accessorKey: 'description',
            header: 'Описание',
            cell: ({ row }) => <span className="text-sm">{row.original.description}</span>,
        },
        {
            accessorKey: 'ip_address',
            header: 'IP-адрес',
            cell: ({ row }) =>
                row.original.ip_address ? (
                    <span className="font-mono text-xs text-muted-foreground">
                        {row.original.ip_address}
                    </span>
                ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                ),
        },
    ];

    const table = useReactTable({
        data: logs.data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getRowId: (row) => String(row.id),
        enableRowSelection: true,
        onRowSelectionChange: setRowSelection,
        state: { rowSelection },
    });

    return (
        <>
            <Head title="Администратор — Журнал" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 lg:p-6">

                <div className="flex items-center gap-2">
                    <ScrollText className="size-5 text-muted-foreground" />
                    <h1 className="text-lg font-semibold">Системный журнал</h1>
                </div>

                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-2">
                    <Select
                        value={filters.event || 'all'}
                        onValueChange={(v) =>
                            navigate({ event: v === 'all' ? undefined : v, page: undefined })
                        }
                    >
                        <SelectTrigger className="h-8 w-48">
                            <SelectValue placeholder="Все события" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Все события</SelectItem>
                            {eventTypes.map((et) => (
                                <SelectItem key={et.value} value={et.value}>
                                    {et.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={filters.user_id ? String(filters.user_id) : 'all'}
                        onValueChange={(v) =>
                            navigate({ user_id: v === 'all' ? undefined : Number(v), page: undefined })
                        }
                    >
                        <SelectTrigger className="h-8 w-52">
                            <SelectValue placeholder="Все пользователи" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Все пользователи</SelectItem>
                            {users.map((u) => (
                                <SelectItem key={u.id} value={String(u.id)}>
                                    {u.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {hasActiveFilters && !hasSelection && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs text-muted-foreground"
                            onClick={() =>
                                navigate({ event: undefined, user_id: undefined, page: undefined })
                            }
                        >
                            Сбросить
                        </Button>
                    )}

                    {hasSelection && (
                        <Button
                            variant="destructive"
                            size="sm"
                            className="h-8"
                            onClick={handleBulkDelete}
                        >
                            <Trash2 className="mr-1.5 size-3.5" />
                            Удалить ({selectedIds.length})
                        </Button>
                    )}

                    {logs.total > 0 && (
                        <span className="ml-auto text-xs text-muted-foreground">
                            {logs.total} записей
                        </span>
                    )}
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-xl border">
                    {logs.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
                            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                                <ScrollText className="size-5 text-muted-foreground" />
                            </div>
                            <p className="text-sm font-medium">Записей нет</p>
                            {hasActiveFilters && (
                                <p className="text-xs text-muted-foreground">
                                    Попробуйте изменить фильтр
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
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
                                    {table.getRowModel().rows.map((row) => (
                                        <tr
                                            key={row.id}
                                            className="border-b transition-colors last:border-0 hover:bg-muted/30"
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
                    )}
                </div>

                {/* Pagination */}
                {logs.last_page > 1 && (
                    <div className="flex flex-wrap items-center justify-between gap-y-2 text-sm text-muted-foreground">
                        <span>
                            {logs.from}–{logs.to} из {logs.total} записей
                        </span>
                        <div className="flex flex-wrap items-center gap-1">
                            {logs.links.map((link, i) =>
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

AdminLogs.layout = {
    breadcrumbs: [
        { title: 'Главная', href: dashboard() },
        { title: 'Администратор', href: '#' },
        { title: 'Журнал', href: adminLogs.index() },
    ],
};
