import { Form, Head, Link, router } from '@inertiajs/react';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import type { ColumnDef } from '@tanstack/react-table';
import { format, parseISO } from 'date-fns';
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, Pencil, Plus, Shield, Users } from 'lucide-react';
import * as React from 'react';

import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { dashboard } from '@/routes';
import * as adminUsersRoute from '@/routes/admin/users';

interface UserRecord {
    id: number;
    name: string;
    username: string | null;
    email: string;
    is_admin: boolean;
    created_at: string;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedUsers {
    data: UserRecord[];
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
    sort: string;
    order: string;
}

interface Props {
    users: PaginatedUsers;
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

export default function AdminUsers({ users, filters }: Props) {
    const [search, setSearch] = React.useState(filters.search);
    const [isCreateOpen, setIsCreateOpen] = React.useState(false);
    const [userToEdit, setUserToEdit] = React.useState<UserRecord | null>(null);

    const searchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const searchRef = React.useRef(search);
    searchRef.current = search;

    function navigate(overrides: Record<string, string | undefined> = {}) {
        const params: Record<string, string | undefined> = {
            search: searchRef.current || undefined,
            sort: filters.sort,
            order: filters.order,
            ...overrides,
        };
        router.get(adminUsersRoute.index.url(), params, { preserveState: true, replace: true });
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
        searchTimeoutRef.current = setTimeout(
            () => navigate({ search: value || undefined, page: '1' }),
            350,
        );
    }

    function handleSort(column: string) {
        const newOrder = filters.sort === column && filters.order === 'asc' ? 'desc' : 'asc';
        navigate({ sort: column, order: newOrder });
    }

    function clearFilters() {
        cancelPendingSearch();
        setSearch('');
        searchRef.current = '';
        router.get(adminUsersRoute.index.url(), {}, { preserveState: true, replace: true });
    }

    const columns: ColumnDef<UserRecord>[] = [
        {
            accessorKey: 'name',
            header: () => (
                <button
                    className="flex cursor-pointer items-center hover:text-foreground"
                    onClick={() => handleSort('name')}
                >
                    Имя <SortIcon column="name" sort={filters.sort} order={filters.order} />
                </button>
            ),
            cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
        },
        {
            accessorKey: 'username',
            header: 'Username',
            cell: ({ row }) => (
                <span className="font-mono text-sm">{row.original.username ?? '—'}</span>
            ),
        },
        {
            accessorKey: 'email',
            header: 'Email',
            cell: ({ row }) => (
                <span className="text-muted-foreground text-sm">{row.original.email}</span>
            ),
        },
        {
            accessorKey: 'is_admin',
            header: 'Роль',
            cell: ({ row }) =>
                row.original.is_admin ? (
                    <span className="text-primary inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium">
                        <Shield className="size-3" />
                        Админ
                    </span>
                ) : (
                    <span className="text-muted-foreground/60 text-sm">—</span>
                ),
        },
        {
            accessorKey: 'created_at',
            header: () => (
                <button
                    className="flex cursor-pointer items-center hover:text-foreground"
                    onClick={() => handleSort('created_at')}
                >
                    Зарегистрирован{' '}
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
                <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="size-7" title="Просмотр" asChild>
                        <Link href={adminUsersRoute.show(row.original.id).url}>
                            <Eye className="size-3.5" />
                        </Link>
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        title="Редактировать пользователя"
                        onClick={() => setUserToEdit(row.original)}
                    >
                        <Pencil className="size-3.5" />
                    </Button>
                </div>
            ),
        },
    ];

    const table = useReactTable({
        data: users.data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        manualSorting: true,
    });

    const hasActiveFilters = Boolean(search);

    return (
        <>
            <Head title="Пользователи" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4 lg:p-6">
                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-2">
                    <Input
                        placeholder="Поиск по имени или email…"
                        value={search}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="h-8 w-64"
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
                    <Button
                        size="sm"
                        className="ml-auto h-8"
                        onClick={() => setIsCreateOpen(true)}
                    >
                        <Plus className="mr-1 size-3.5" />
                        Создать пользователя
                    </Button>
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-xl border">
                    {users.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
                            <div className="bg-muted flex size-12 items-center justify-center rounded-full">
                                <Users className="text-muted-foreground size-5" />
                            </div>
                            <p className="text-sm font-medium">Пользователи не найдены</p>
                            {hasActiveFilters && (
                                <p className="text-muted-foreground text-xs">
                                    Попробуйте изменить параметры поиска
                                </p>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Mobile: card list */}
                            <div className="divide-y md:hidden">
                                {users.data.map((user) => (
                                    <div key={user.id} className="flex flex-col gap-2 px-4 py-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex min-w-0 flex-col">
                                                <span className="truncate text-sm font-medium">
                                                    {user.name}
                                                </span>
                                                {user.username && (
                                                    <span className="font-mono text-xs">
                                                        {user.username}
                                                    </span>
                                                )}
                                                <span className="text-muted-foreground truncate text-xs">
                                                    {user.email}
                                                </span>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-0.5">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-7"
                                                    title="Просмотр"
                                                    asChild
                                                >
                                                    <Link href={adminUsersRoute.show(user.id).url}>
                                                        <Eye className="size-3.5" />
                                                    </Link>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-7"
                                                    title="Редактировать пользователя"
                                                    onClick={() => setUserToEdit(user)}
                                                >
                                                    <Pencil className="size-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                                            {user.is_admin && (
                                                <span className="text-primary inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium">
                                                    <Shield className="size-3" />
                                                    Админ
                                                </span>
                                            )}
                                            <span className="whitespace-nowrap">
                                                {format(parseISO(user.created_at), 'dd.MM.yyyy HH:mm')}
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
                                                className="hover:bg-muted/30 border-b transition-colors last:border-0"
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
                {users.last_page > 1 && (
                    <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-y-2 text-sm">
                        <span>
                            {users.from}–{users.to} из {users.total} пользователей
                        </span>
                        <div className="flex flex-wrap items-center gap-1">
                            {users.links.map((link, i) =>
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

            {/* Create user dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Создать пользователя</DialogTitle>
                        <DialogDescription>
                            Заполните данные нового пользователя. Пароль задаётся администратором.
                        </DialogDescription>
                    </DialogHeader>
                    <Form
                        action={adminUsersRoute.store.url()}
                        method="post"
                        resetOnSuccess={true}
                        onSuccess={() => setIsCreateOpen(false)}
                        className="flex flex-col gap-4 py-2"
                    >
                        {({ processing, errors }) => (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="create-name">Имя</Label>
                                    <Input
                                        id="create-name"
                                        name="name"
                                        type="text"
                                        required
                                        autoComplete="off"
                                        placeholder="Полное имя"
                                    />
                                    <InputError message={errors.name} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="create-username">Имя пользователя</Label>
                                    <Input
                                        id="create-username"
                                        name="username"
                                        type="text"
                                        required
                                        autoComplete="off"
                                        placeholder="username"
                                    />
                                    <InputError message={errors.username} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="create-email">Email</Label>
                                    <Input
                                        id="create-email"
                                        name="email"
                                        type="email"
                                        required
                                        autoComplete="off"
                                        placeholder="email@example.com"
                                    />
                                    <InputError message={errors.email} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="create-password">Пароль</Label>
                                    <PasswordInput
                                        id="create-password"
                                        name="password"
                                        required
                                        autoComplete="new-password"
                                        placeholder="Пароль"
                                    />
                                    <InputError message={errors.password} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="create-password-confirmation">Подтверждение пароля</Label>
                                    <PasswordInput
                                        id="create-password-confirmation"
                                        name="password_confirmation"
                                        required
                                        autoComplete="new-password"
                                        placeholder="Повторите пароль"
                                    />
                                    <InputError message={errors.password_confirmation} />
                                </div>

                                <div className="flex items-center gap-3">
                                    <Checkbox id="create-is-admin" name="is_admin" value="1" />
                                    <Label htmlFor="create-is-admin" className="flex flex-col gap-0.5">
                                        <span>Права администратора</span>
                                        <span className="text-muted-foreground text-xs font-normal">
                                            Предоставляет полный доступ к панели управления
                                        </span>
                                    </Label>
                                </div>

                                <DialogFooter>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setIsCreateOpen(false)}
                                        disabled={processing}
                                    >
                                        Отмена
                                    </Button>
                                    <Button type="submit" disabled={processing}>
                                        {processing ? 'Создание…' : 'Создать'}
                                    </Button>
                                </DialogFooter>
                            </>
                        )}
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Edit user dialog */}
            <Dialog open={!!userToEdit} onOpenChange={(open) => !open && setUserToEdit(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Редактировать пользователя</DialogTitle>
                        <DialogDescription>
                            Редактирование данных пользователя{' '}
                            <span className="text-foreground font-medium">{userToEdit?.name}</span>.
                        </DialogDescription>
                    </DialogHeader>
                    {userToEdit && (
                        <Form
                            key={userToEdit.id}
                            action={adminUsersRoute.update.url(userToEdit.id)}
                            method="patch"
                            onSuccess={() => setUserToEdit(null)}
                            className="flex flex-col gap-4 py-2"
                        >
                            {({ processing, errors }) => (
                                <>
                                    <div className="grid gap-2">
                                        <Label htmlFor="edit-name">Имя</Label>
                                        <Input
                                            id="edit-name"
                                            name="name"
                                            type="text"
                                            required
                                            autoComplete="off"
                                            defaultValue={userToEdit.name}
                                        />
                                        <InputError message={errors.name} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="edit-username">Имя пользователя</Label>
                                        <Input
                                            id="edit-username"
                                            name="username"
                                            type="text"
                                            required
                                            autoComplete="off"
                                            defaultValue={userToEdit.username ?? ''}
                                        />
                                        <InputError message={errors.username} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="edit-email">Email</Label>
                                        <Input
                                            id="edit-email"
                                            name="email"
                                            type="email"
                                            required
                                            autoComplete="off"
                                            defaultValue={userToEdit.email}
                                        />
                                        <InputError message={errors.email} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="edit-password">Новый пароль</Label>
                                        <PasswordInput
                                            id="edit-password"
                                            name="password"
                                            autoComplete="new-password"
                                            placeholder="Оставьте пустым, чтобы не менять"
                                        />
                                        <InputError message={errors.password} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="edit-password-confirmation">
                                            Подтверждение пароля
                                        </Label>
                                        <PasswordInput
                                            id="edit-password-confirmation"
                                            name="password_confirmation"
                                            autoComplete="new-password"
                                            placeholder="Повторите новый пароль"
                                        />
                                        <InputError message={errors.password_confirmation} />
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Checkbox
                                            id="edit-is-admin"
                                            name="is_admin"
                                            value="1"
                                            defaultChecked={userToEdit.is_admin}
                                        />
                                        <Label htmlFor="edit-is-admin" className="flex flex-col gap-0.5">
                                            <span>Права администратора</span>
                                            <span className="text-muted-foreground text-xs font-normal">
                                                Предоставляет полный доступ к панели управления
                                            </span>
                                        </Label>
                                    </div>

                                    <DialogFooter>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setUserToEdit(null)}
                                            disabled={processing}
                                        >
                                            Отмена
                                        </Button>
                                        <Button type="submit" disabled={processing}>
                                            {processing ? 'Сохранение…' : 'Сохранить'}
                                        </Button>
                                    </DialogFooter>
                                </>
                            )}
                        </Form>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

AdminUsers.layout = {
    breadcrumbs: [
        { title: 'Главная', href: dashboard() },
        { title: 'Пользователи', href: adminUsersRoute.index() },
    ],
};
