import { Head, Link, useForm } from '@inertiajs/react';
import { ChevronRight, Folder, FolderPlus } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { dashboard } from '@/routes';
import * as foldersRoute from '@/routes/folders';

interface FolderItem {
    id: number;
    name: string;
    children_count: number;
    files_count: number;
}

interface Props {
    folders: FolderItem[];
}

function folderMeta(folder: FolderItem): string {
    const parts: string[] = [];
    if (folder.children_count > 0) {
        parts.push(`${folder.children_count} ${folder.children_count === 1 ? 'subfolder' : 'subfolders'}`);
    }
    if (folder.files_count > 0) {
        parts.push(`${folder.files_count} ${folder.files_count === 1 ? 'file' : 'files'}`);
    }
    return parts.join(' · ') || 'Empty';
}

export default function FoldersIndex({ folders }: Props) {
    const [showCreate, setShowCreate] = React.useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({ name: '' });

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

    return (
        <>
            <Head title="Folders" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4 lg:p-6">
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        {folders.length} {folders.length === 1 ? 'folder' : 'folders'}
                    </p>
                    <Button size="sm" className="h-8 gap-1.5" onClick={openCreate}>
                        <FolderPlus className="size-3.5" />
                        New folder
                    </Button>
                </div>

                <div className="overflow-hidden rounded-xl border">
                    {folders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
                            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                                <Folder className="size-5 text-muted-foreground" />
                            </div>
                            <p className="text-sm font-medium">No folders yet</p>
                            <p className="text-xs text-muted-foreground">
                                Create a folder to organise your media files
                            </p>
                            <button
                                className="mt-1 text-xs text-primary underline underline-offset-4 hover:text-primary/80"
                                onClick={openCreate}
                            >
                                Create a folder
                            </button>
                        </div>
                    ) : (
                        <ul>
                            {folders.map((folder, i) => (
                                <li key={folder.id} className={i !== folders.length - 1 ? 'border-b' : ''}>
                                    <Link
                                        href={foldersRoute.show(folder.id).url}
                                        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
                                        prefetch
                                    >
                                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                                            <Folder className="size-4 text-amber-600 dark:text-amber-400" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium">{folder.name}</p>
                                            <p className="text-xs text-muted-foreground">{folderMeta(folder)}</p>
                                        </div>
                                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            <Dialog open={showCreate} onOpenChange={(open) => { if (!open) reset(); setShowCreate(open); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>New folder</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="folder-name">Folder name</Label>
                            <Input
                                id="folder-name"
                                placeholder="e.g. Videos"
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
                                Cancel
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Creating…' : 'Create'}
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
        { title: 'Dashboard', href: dashboard() },
        { title: 'Folders', href: foldersRoute.index() },
    ],
};
