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

function ruPlural(n: number, one: string, few: string, many: string): string {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return `${n} ${one}`;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} ${few}`;
    return `${n} ${many}`;
}

function folderMeta(folder: FolderItem): string {
    const parts: string[] = [];
    if (folder.children_count > 0) {
        parts.push(ruPlural(folder.children_count, 'подпапка', 'подпапки', 'подпапок'));
    }
    if (folder.files_count > 0) {
        parts.push(ruPlural(folder.files_count, 'файл', 'файла', 'файлов'));
    }
    return parts.join(' · ') || 'Пустая';
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
            <Head title="Папки" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4 lg:p-6">
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        {ruPlural(folders.length, 'папка', 'папки', 'папок')}
                    </p>
                    <Button size="sm" className="h-8 gap-1.5" onClick={openCreate}>
                        <FolderPlus className="size-3.5" />
                        Новая папка
                    </Button>
                </div>

                <div className="overflow-hidden rounded-xl border">
                    {folders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
                            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                                <Folder className="size-5 text-muted-foreground" />
                            </div>
                            <p className="text-sm font-medium">Папок пока нет</p>
                            <p className="text-xs text-muted-foreground">
                                Создайте папку для организации медиафайлов
                            </p>
                            <button
                                className="mt-1 text-xs text-primary underline underline-offset-4 hover:text-primary/80"
                                onClick={openCreate}
                            >
                                Создать папку
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
                        <DialogTitle>Новая папка</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="folder-name">Название папки</Label>
                            <Input
                                id="folder-name"
                                placeholder="напр. Видео"
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
                                Отмена
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Создание…' : 'Создать'}
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
        { title: 'Главная', href: dashboard() },
        { title: 'Папки', href: foldersRoute.index() },
    ],
};
