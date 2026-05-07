import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Film, Folder } from 'lucide-react';
import * as foldersRoute from '@/routes/folders';
import { dashboard } from '@/routes';

interface Props {
    // TODO: replace with real Folder type when model is ready
    id?: number;
}

export default function FoldersShow({ id }: Props) {
    return (
        <>
            <Head title="Folder" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 lg:p-6">

                {/* Back link */}
                <Link
                    href={foldersRoute.index().url}
                    className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="size-3.5" />
                    Back to folders
                </Link>

                {/* Folder header */}
                <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                        <Folder className="size-5 text-muted-foreground" />
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold">Folder name</h1>
                        <p className="text-xs text-muted-foreground">0 files</p>
                    </div>
                </div>

                {/* Files inside folder — TODO: replace with real data */}
                <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-sidebar-border/70 p-6 text-center dark:border-sidebar-border">
                    <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                        <Film className="size-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">This folder is empty</p>
                    <p className="text-xs text-muted-foreground">Upload files and move them here</p>
                </div>
            </div>
        </>
    );
}

FoldersShow.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Folders', href: foldersRoute.index() },
        { title: 'Folder', href: '#' },
    ],
};
