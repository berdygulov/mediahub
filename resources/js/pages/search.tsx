import { Head, Link, router } from '@inertiajs/react';
import { Search, Film, Music, X } from 'lucide-react';
import { useState } from 'react';
import * as searchRoute from '@/routes/search';
import { dashboard } from '@/routes';

interface Props {
    query: string;
    type?: 'video' | 'audio';
}

export default function SearchPage({ query, type }: Props) {
    const [searchInput, setSearchInput] = useState(query);

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        router.get(searchRoute.index().url, {
            q: searchInput,
            ...(type ? { type } : {}),
        });
    }

    return (
        <>
            <Head title={query ? `Search: ${query}` : 'Search'} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 lg:p-6">

                {/* Search bar */}
                <form onSubmit={handleSearch} className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="search"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Search files..."
                            className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>

                    {/* Type filter */}
                    <div className="flex items-center gap-1">
                        <Link
                            href={searchRoute.index({ query: { q: query } }).url}
                            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${!type ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                        >
                            All
                        </Link>
                        <Link
                            href={searchRoute.index({ query: { q: query, type: 'video' } }).url}
                            className={`flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${type === 'video' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                        >
                            <Film className="size-3.5" />
                            Video
                        </Link>
                        <Link
                            href={searchRoute.index({ query: { q: query, type: 'audio' } }).url}
                            className={`flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${type === 'audio' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                        >
                            <Music className="size-3.5" />
                            Audio
                        </Link>
                    </div>
                </form>

                {/* Results — TODO: replace with real search results */}
                <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-sidebar-border/70 p-6 text-center dark:border-sidebar-border">
                    <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                        <Search className="size-5 text-muted-foreground" />
                    </div>
                    {query ? (
                        <>
                            <p className="text-sm font-medium">No results for &quot;{query}&quot;</p>
                            <p className="text-xs text-muted-foreground">Try a different search term or filter</p>
                        </>
                    ) : (
                        <>
                            <p className="text-sm font-medium">Search for files</p>
                            <p className="text-xs text-muted-foreground">Enter a file name above to search</p>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}

SearchPage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Search', href: searchRoute.index() },
    ],
};
