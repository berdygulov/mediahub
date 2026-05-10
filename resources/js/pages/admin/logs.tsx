import { Head } from '@inertiajs/react';
import { ScrollText } from 'lucide-react';
import { dashboard } from '@/routes';
import * as adminLogs from '@/routes/admin/logs';

export default function AdminLogs() {
    return (
        <>
            <Head title="Admin — Logs" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 lg:p-6">

                <div className="flex items-center gap-2">
                    <ScrollText className="size-5 text-muted-foreground" />
                    <h1 className="text-lg font-semibold">System Logs</h1>
                </div>

                {/* Log entries — TODO: replace with real log data */}
                <div className="flex flex-1 flex-col gap-2 overflow-hidden rounded-xl border border-sidebar-border/70 p-4 font-mono text-xs dark:border-sidebar-border">
                    <div className="flex flex-1 items-center justify-center text-muted-foreground">
                        No log entries
                    </div>
                </div>
            </div>
        </>
    );
}

AdminLogs.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Admin', href: '#' },
        { title: 'Logs', href: adminLogs.index() },
    ],
};
