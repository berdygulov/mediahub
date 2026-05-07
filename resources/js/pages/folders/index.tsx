import { Head, Link } from '@inertiajs/react';
import { Folder, FolderPlus } from 'lucide-react';
import * as foldersRoute from '@/routes/folders';
import { dashboard } from '@/routes';

export default function FoldersIndex() {
    return (
        <>
            <Head title="Folders" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 lg:p-6">

                {/* Toolbar */}
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-medium text-muted-foreground">All folders</h2>
                    <button className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                        <FolderPlus className="size-3.5" />
                        New folder
                    </button>
                </div>

                {/* Folder grid — TODO: replace with real data */}
                <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-sidebar-border/70 p-6 text-center dark:border-sidebar-border">
                    <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                        <Folder className="size-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">No folders yet</p>
                    <p className="text-xs text-muted-foreground">Create a folder to organise your media files</p>
                    <button className="mt-1 text-xs text-primary underline underline-offset-4 hover:text-primary/80">
                        Create a folder
                    </button>
                </div>
            </div>
        </>
    );
}

FoldersIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Folders', href: foldersRoute.index() },
    ],
};
