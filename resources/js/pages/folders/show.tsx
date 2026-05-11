import { Head, Link, setLayoutProps, useForm } from '@inertiajs/react';
import { ChevronRight, Film, Folder, FolderPlus, Music } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
import { dashboard } from '@/routes';
import * as filesRoute from '@/routes/files';
import * as foldersRoute from '@/routes/folders';

interface FolderItem {
    id: number;
    name: string;
    children_count: number;
    files_count: number;
}

interface FileItem {
    id: number;
    name: string;
    type: 'video' | 'audio';
    mime_type: string;
    size: number;
}

interface AncestorItem {
    id: number;
    name: string;
}

interface Props {
    folder: FolderItem;
    subfolders: FolderItem[];
    files: FileItem[];
    ancestors: AncestorItem[];
}

function formatBytes(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
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

export default function FoldersShow({ folder, subfolders, files, ancestors }: Props) {
    setLayoutProps({
        breadcrumbs: [
            { title: 'Dashboard', href: dashboard() },
            { title: 'Folders', href: foldersRoute.index() },
            ...ancestors.map((a) => ({ title: a.name, href: foldersRoute.show(a.id) })),
            { title: folder.name, href: foldersRoute.show(folder.id) },
        ],
    });

    const [showCreate, setShowCreate] = React.useState(false);
    const { data, setData, post, processing, errors, clearErrors } = useForm({
        name: '',
        parent_id: folder.id,
    });

    function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        post(foldersRoute.store.url(), {
            onSuccess: () => {
                clearErrors();
                setData('name', '');
                setShowCreate(false);
            },
        });
    }

    function openCreate() {
        clearErrors();
        setData('name', '');
        setData('parent_id', folder.id);
        setShowCreate(true);
    }

    return (
        <>
            <Head title={folder.name} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 lg:p-6">
                {/* Folder header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                            <Folder className="size-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold">{folder.name}</h1>
                            <p className="text-xs text-muted-foreground">{folderMeta(folder)}</p>
                        </div>
                    </div>
                    <Button size="sm" className="h-8 gap-1.5" onClick={openCreate}>
                        <FolderPlus className="size-3.5" />
                        New subfolder
                    </Button>
                </div>

                {/* Subfolders */}
                <div className="overflow-hidden rounded-xl border">
                    {subfolders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
                            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                                <Folder className="size-4 text-muted-foreground" />
                            </div>
                            <p className="text-sm font-medium">No subfolders</p>
                            <button
                                className="text-xs text-primary underline underline-offset-4 hover:text-primary/80"
                                onClick={openCreate}
                            >
                                Create a subfolder
                            </button>
                        </div>
                    ) : (
                        <ul>
                            {subfolders.map((sub, i) => (
                                <li key={sub.id} className={i !== subfolders.length - 1 ? 'border-b' : ''}>
                                    <Link
                                        href={foldersRoute.show(sub.id).url}
                                        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
                                        prefetch
                                    >
                                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                                            <Folder className="size-4 text-amber-600 dark:text-amber-400" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium">{sub.name}</p>
                                            <p className="text-xs text-muted-foreground">{folderMeta(sub)}</p>
                                        </div>
                                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Files */}
                {files.length > 0 && (
                    <>
                        <div className="flex items-center gap-3">
                            <Separator className="flex-1" />
                            <span className="text-xs text-muted-foreground">
                                {files.length} {files.length === 1 ? 'file' : 'files'}
                            </span>
                            <Separator className="flex-1" />
                        </div>

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
                                                <p className="text-xs text-muted-foreground">
                                                    {file.mime_type} · {formatBytes(file.size)}
                                                </p>
                                            </div>
                                            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </>
                )}
            </div>

            {/* Create subfolder dialog */}
            <Dialog
                open={showCreate}
                onOpenChange={(open) => {
                    if (!open) clearErrors();
                    setShowCreate(open);
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>New subfolder in "{folder.name}"</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="subfolder-name">Subfolder name</Label>
                            <Input
                                id="subfolder-name"
                                placeholder="e.g. 2024"
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
