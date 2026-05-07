import { Head, Link } from '@inertiajs/react';
import { Film, Music, Upload, SlidersHorizontal } from 'lucide-react';
import { dashboard } from '@/routes';
import * as files from '@/routes/files';
import * as upload from '@/routes/upload';

interface Props {
    type?: 'video' | 'audio';
    sort?: string;
    order?: string;
}

export default function FilesIndex({ type, sort, order }: Props) {
    return (
        <>
            <Head title="Files" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 lg:p-6">

                {/* Toolbar */}
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Link
                            href={files.index().url}
                            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${!type ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                        >
                            All
                        </Link>
                        <Link
                            href={files.index({ query: { type: 'video' } }).url}
                            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${type === 'video' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                        >
                            <Film className="size-3.5" />
                            Video
                        </Link>
                        <Link
                            href={files.index({ query: { type: 'audio' } }).url}
                            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${type === 'audio' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                        >
                            <Music className="size-3.5" />
                            Audio
                        </Link>
                    </div>

                    <div className="flex items-center gap-2">
                        <button className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
                            <SlidersHorizontal className="size-3.5" />
                            Sort
                        </button>
                        <Link
                            href={upload.create().url}
                            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                        >
                            <Upload className="size-3.5" />
                            Upload
                        </Link>
                    </div>
                </div>

                {/* File grid — TODO: replace with real data */}
                <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-sidebar-border/70 p-6 text-center dark:border-sidebar-border">
                    <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                        <Film className="size-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">No files yet</p>
                    <p className="text-xs text-muted-foreground">Upload your first audio or video file to get started</p>
                    <Link
                        href={upload.create().url}
                        className="mt-1 text-xs text-primary underline underline-offset-4 hover:text-primary/80"
                    >
                        Upload a file
                    </Link>
                </div>
            </div>
        </>
    );
}

FilesIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Files', href: files.index() },
    ],
};
