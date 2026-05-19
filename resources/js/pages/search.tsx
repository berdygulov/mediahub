import { Head, Link, router } from '@inertiajs/react';
import { ChevronRight, Film, Folder, Music, Search } from 'lucide-react';
import { useState } from 'react';

import { formatBytes } from '@/lib/utils';
import { dashboard } from '@/routes';
import * as filesRoute from '@/routes/files';
import * as foldersRoute from '@/routes/folders';
import * as searchRoute from '@/routes/search';

type SearchType = 'folder' | 'video' | 'audio';

interface PathSegment {
    id: number;
    name: string;
}

interface FolderResult {
    id: number;
    name: string;
    path: PathSegment[];
}

interface FileResult {
    id: number;
    name: string;
    type: 'video' | 'audio';
    mime_type: string;
    size: number;
    folder_path: PathSegment[];
}

interface Props {
    query: string;
    type?: SearchType;
    folders: FolderResult[];
    files: FileResult[];
}

const FILTER_TABS = [
    { label: 'Все', value: undefined },
    { label: 'Папки', value: 'folder' as SearchType, icon: Folder },
    { label: 'Видео', value: 'video' as SearchType, icon: Film },
    { label: 'Аудио', value: 'audio' as SearchType, icon: Music },
] as const;

function BreadcrumbPath({ path, emptyMessage }: { path: PathSegment[]; emptyMessage: string }) {
    if (path.length === 0) {
        return <span className="text-xs text-muted-foreground">{emptyMessage}</span>;
    }

    return (
        <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
            <span>Root</span>
            {path.map((segment) => (
                <span key={segment.id} className="flex items-center gap-0.5">
                    <ChevronRight className="size-3 shrink-0" />
                    <Link
                        href={foldersRoute.show(segment.id).url}
                        className="transition-colors hover:text-foreground"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {segment.name}
                    </Link>
                </span>
            ))}
        </span>
    );
}

export default function SearchPage({ query, type, folders, files }: Props) {
    const [searchInput, setSearchInput] = useState(query);
    const hasQuery = query.length >= 2;

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        router.get(searchRoute.index().url, {
            q: searchInput,
            ...(type ? { type } : {}),
        });
    }

    function filterUrl(t?: SearchType) {
        return searchRoute.index({ query: { q: query, ...(t ? { type: t } : {}) } }).url;
    }

    return (
        <>
            <Head title={query ? `Поиск: ${query}` : 'Поиск'} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 lg:p-6">

                {/* Search bar */}
                <form onSubmit={handleSearch} className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="search"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Поиск файлов и папок..."
                            className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                            autoFocus
                        />
                    </div>

                    <div className="flex items-center gap-1">
                        {FILTER_TABS.map((tab) => (
                            <Link
                                key={tab.label}
                                href={filterUrl(tab.value)}
                                className={`flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                    type === tab.value
                                        ? 'bg-primary text-primary-foreground'
                                        : 'hover:bg-muted'
                                }`}
                            >
                                {tab.icon && <tab.icon className="size-3.5" />}
                                {tab.label}
                            </Link>
                        ))}
                    </div>
                </form>

                {/* Results */}
                {!hasQuery ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-sidebar-border/70 p-6 text-center dark:border-sidebar-border">
                        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                            <Search className="size-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium">Поиск файлов и папок</p>
                        <p className="text-xs text-muted-foreground">Введите не менее 2 символов</p>
                    </div>
                ) : folders.length + files.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-sidebar-border/70 p-6 text-center dark:border-sidebar-border">
                        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                            <Search className="size-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium">Ничего не найдено по запросу &quot;{query}&quot;</p>
                        <p className="text-xs text-muted-foreground">Попробуйте другой запрос или фильтр</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-6">
                        {/* Folders section */}
                        {folders.length > 0 && (
                            <div className="flex flex-col gap-2">
                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    Папки · {folders.length}
                                </p>
                                <div className="overflow-hidden rounded-xl border">
                                    <ul>
                                        {folders.map((folder, i) => (
                                            <li key={folder.id} className={i !== folders.length - 1 ? 'border-b' : ''}>
                                                <Link
                                                    href={foldersRoute.show(folder.id).url}
                                                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
                                                >
                                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                                                        <Folder className="size-4 text-amber-600 dark:text-amber-400" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-medium">{folder.name}</p>
                                                        <BreadcrumbPath path={folder.path} emptyMessage="Корень" />
                                                    </div>
                                                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}

                        {/* Files section */}
                        {files.length > 0 && (
                            <div className="flex flex-col gap-2">
                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    Файлы · {files.length}
                                </p>
                                <div className="overflow-hidden rounded-xl border">
                                    <ul>
                                        {files.map((file, i) => (
                                            <li key={file.id} className={i !== files.length - 1 ? 'border-b' : ''}>
                                                <Link
                                                    href={filesRoute.show(file.id).url}
                                                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
                                                >
                                                    <div
                                                        className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                                                            file.type === 'video'
                                                                ? 'bg-blue-100 dark:bg-blue-900/30'
                                                                : 'bg-purple-100 dark:bg-purple-900/30'
                                                        }`}
                                                    >
                                                        {file.type === 'video' ? (
                                                            <Film className="size-4 text-blue-600 dark:text-blue-400" />
                                                        ) : (
                                                            <Music className="size-4 text-purple-600 dark:text-purple-400" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-medium">{file.name}</p>
                                                        <div className="flex items-center gap-2">
                                                            <BreadcrumbPath path={file.folder_path} emptyMessage="Без папки" />
                                                            <span className="text-xs text-muted-foreground/50">·</span>
                                                            <span className="text-xs text-muted-foreground">{formatBytes(file.size)}</span>
                                                        </div>
                                                    </div>
                                                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}

SearchPage.layout = {
    breadcrumbs: [
        { title: 'Главная', href: dashboard() },
        { title: 'Поиск', href: searchRoute.index() },
    ],
};
