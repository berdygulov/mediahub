import { Head, Link } from '@inertiajs/react';
import { Upload, Film, Music, CloudUpload } from 'lucide-react';
import * as uploadRoute from '@/routes/upload';
import { dashboard } from '@/routes';

export default function UploadPage() {
    return (
        <>
            <Head title="Upload" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 lg:p-6">

                {/* Drop zone — TODO: wire up real upload with progress */}
                <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-sidebar-border/70 p-10 text-center transition-colors hover:border-primary/40 dark:border-sidebar-border">
                    <div className="flex size-16 items-center justify-center rounded-full bg-muted">
                        <CloudUpload className="size-8 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <p className="text-sm font-medium">Drag and drop files here</p>
                        <p className="text-xs text-muted-foreground">
                            Supported formats: MP4, MKV, AVI, MP3, WAV, FLAC
                        </p>
                    </div>
                    <label className="cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                        <Upload className="mr-1.5 inline-block size-3.5" />
                        Browse files
                        {/* TODO: bind to hidden file input */}
                        <input type="file" className="sr-only" accept=".mp4,.mkv,.avi,.mp3,.wav,.flac" multiple />
                    </label>
                </div>

                {/* Supported types legend */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {(['MP4', 'MKV', 'AVI'] as const).map((ext) => (
                        <div key={ext} className="flex items-center gap-2 rounded-lg border border-sidebar-border/70 p-3 dark:border-sidebar-border">
                            <Film className="size-4 shrink-0 text-muted-foreground" />
                            <span className="text-xs font-medium">{ext}</span>
                        </div>
                    ))}
                    {(['MP3', 'WAV', 'FLAC'] as const).map((ext) => (
                        <div key={ext} className="flex items-center gap-2 rounded-lg border border-sidebar-border/70 p-3 dark:border-sidebar-border">
                            <Music className="size-4 shrink-0 text-muted-foreground" />
                            <span className="text-xs font-medium">{ext}</span>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}

UploadPage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Upload', href: uploadRoute.create() },
    ],
};
