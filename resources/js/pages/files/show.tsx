import { Head, Link } from '@inertiajs/react';
import { Download, Trash2, ArrowLeft, Film, Music } from 'lucide-react';
import * as filesRoute from '@/routes/files';
import { dashboard } from '@/routes';

interface Props {
    // TODO: replace with real File type when model is ready
    id?: number;
}

export default function FilesShow({ id }: Props) {
    return (
        <>
            <Head title="View File" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 lg:p-6">

                {/* Back link */}
                <Link
                    href={filesRoute.index().url}
                    className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="size-3.5" />
                    Back to files
                </Link>

                {/* Player area — TODO: render HTML5 player based on file type */}
                <div className="flex flex-1 flex-col gap-4 rounded-xl border border-sidebar-border/70 p-6 dark:border-sidebar-border">
                    <div className="flex items-center justify-center rounded-lg bg-muted aspect-video">
                        <Film className="size-16 text-muted-foreground/40" />
                    </div>

                    {/* File info & actions */}
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex flex-col gap-1">
                            <h1 className="text-lg font-semibold">filename.mp4</h1>
                            <p className="text-sm text-muted-foreground">Video · 0 MB · Uploaded just now</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <a
                                href="#"
                                download
                                className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
                            >
                                <Download className="size-3.5" />
                                Download
                            </a>
                            <button className="flex items-center gap-1.5 rounded-md border border-destructive/30 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10">
                                <Trash2 className="size-3.5" />
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

FilesShow.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Files', href: filesRoute.index() },
        { title: 'View file', href: '#' },
    ],
};
