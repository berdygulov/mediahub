import { Head, Link } from '@inertiajs/react';
import { Film, Image, FileText, Upload, HardDrive } from 'lucide-react';
import { dashboard } from '@/routes';

export default function Dashboard() {
    return (
        <>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 lg:p-6">
                <div className="grid gap-4 md:grid-cols-4">
                    <div className="rounded-xl border border-sidebar-border/70 bg-card p-4 dark:border-sidebar-border">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">Total Files</p>
                            <HardDrive className="size-4 text-muted-foreground" />
                        </div>
                        <p className="mt-2 text-2xl font-semibold">0</p>
                    </div>
                    <div className="rounded-xl border border-sidebar-border/70 bg-card p-4 dark:border-sidebar-border">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">Videos</p>
                            <Film className="size-4 text-muted-foreground" />
                        </div>
                        <p className="mt-2 text-2xl font-semibold">0</p>
                    </div>
                    <div className="rounded-xl border border-sidebar-border/70 bg-card p-4 dark:border-sidebar-border">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">Images</p>
                            <Image className="size-4 text-muted-foreground" />
                        </div>
                        <p className="mt-2 text-2xl font-semibold">0</p>
                    </div>
                    <div className="rounded-xl border border-sidebar-border/70 bg-card p-4 dark:border-sidebar-border">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">Documents</p>
                            <FileText className="size-4 text-muted-foreground" />
                        </div>
                        <p className="mt-2 text-2xl font-semibold">0</p>
                    </div>
                </div>

                <div className="flex flex-1 flex-col gap-4 rounded-xl border border-sidebar-border/70 p-6 dark:border-sidebar-border">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-medium">Recent uploads</h2>
                        <Link href="/upload" className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                            <Upload className="size-3.5" />
                            Upload
                        </Link>
                    </div>
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                            <HardDrive className="size-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium">No files yet</p>
                        <p className="text-xs text-muted-foreground">Upload your first file to get started</p>
                        <Link href="/upload" className="mt-1 text-xs text-primary underline underline-offset-4 hover:text-primary/80">
                            Upload a file
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
