import { Head, Link, router } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Download, Pause, Play, Trash2, Volume2, VolumeX } from 'lucide-react';
import Plyr from 'plyr';
import 'plyr/dist/plyr.css';
import * as React from 'react';
import WaveSurfer from 'wavesurfer.js';
import SpectrogramPlugin from 'wavesurfer.js/dist/plugins/spectrogram.esm.js';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { dashboard } from '@/routes';
import * as filesRoute from '@/routes/files';

interface FileFolder {
    id: number;
    name: string;
}

interface FileOwner {
    id: number;
    name: string;
}

interface FileRecord {
    id: number;
    name: string;
    mime_type: string;
    type: 'video' | 'audio';
    size: number;
    folder: FileFolder | null;
    user: FileOwner;
    created_at: string;
}

interface Props {
    file: FileRecord;
    streamUrl: string;
    downloadUrl: string;
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    if (bytes < 1024 * 1024 * 1024) {
        return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    }

    return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);

    return `${m}:${s.toString().padStart(2, '0')}`;
}

function VideoPlayer({ streamUrl, mimeType }: { streamUrl: string; mimeType: string }) {
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const plyrRef = React.useRef<Plyr | null>(null);

    React.useEffect(() => {
        if (!videoRef.current) {
            return;
        }

        plyrRef.current = new Plyr(videoRef.current, {
            controls: [
                'play-large',
                'play',
                'progress',
                'current-time',
                'mute',
                'volume',
                'settings',
                'fullscreen',
            ],
        });

        return () => {
            plyrRef.current?.destroy();
        };
    }, [streamUrl]);

    return (
        <div className="overflow-hidden rounded-lg">
            <video ref={videoRef} playsInline>
                <source src={streamUrl} type={mimeType} />
            </video>
        </div>
    );
}

function AudioPlayer({ streamUrl }: { streamUrl: string }) {
    const waveformRef = React.useRef<HTMLDivElement>(null);
    const wavesurferRef = React.useRef<WaveSurfer | null>(null);

    const [isPlaying, setIsPlaying] = React.useState(false);
    const [currentTime, setCurrentTime] = React.useState(0);
    const [duration, setDuration] = React.useState(0);
    const [isMuted, setIsMuted] = React.useState(false);
    const [volume, setVolume] = React.useState(0.8);
    const [isLoading, setIsLoading] = React.useState(true);

    const volumeRef = React.useRef(volume);
    volumeRef.current = volume;

    React.useEffect(() => {
        if (!waveformRef.current) {
            return;
        }

        const ws = WaveSurfer.create({
            container: waveformRef.current,
            waveColor: '#6366f1',
            progressColor: '#4f46e5',
            cursorColor: '#818cf8',
            barWidth: 2,
            barGap: 1,
            barRadius: 2,
            height: 80,
            normalize: true,
            sampleRate: 44100,
        });

        ws.registerPlugin(
            SpectrogramPlugin.create({
                labels: true,
                height: 120,
                labelsBackground: 'rgba(0,0,0,0.1)',
                fftSamples: 1024,
                frequencyMin: 0,
                frequencyMax: 8000,
                scale: 'mel',
                colorMap: 'roseus',
                windowFunc: 'hann',
                gainDB: 20,
                rangeDB: 80,
                useWebWorker: true,
            }),
        );

        ws.load(streamUrl);
        wavesurferRef.current = ws;

        ws.on('ready', (dur) => {
            setDuration(dur);
            setIsLoading(false);
            ws.setVolume(volumeRef.current);
        });

        ws.on('timeupdate', (time) => setCurrentTime(time));
        ws.on('play', () => setIsPlaying(true));
        ws.on('pause', () => setIsPlaying(false));
        ws.on('finish', () => setIsPlaying(false));

        return () => ws.destroy();
    }, [streamUrl]);

    function togglePlayPause() {
        wavesurferRef.current?.playPause();
    }

    function toggleMute() {
        const ws = wavesurferRef.current;

        if (!ws) {
            return;
        }

        const next = !isMuted;
        ws.setMuted(next);
        setIsMuted(next);
    }

    function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
        const val = parseFloat(e.target.value);
        setVolume(val);
        wavesurferRef.current?.setVolume(val);

        if (val > 0 && isMuted) {
            wavesurferRef.current?.setMuted(false);
            setIsMuted(false);
        }
    }

    return (
        <div className="flex flex-col gap-3">
            <div className="relative rounded-lg bg-muted/50 p-4">
                {isLoading && (
                    <div className="absolute inset-0 z-10 flex animate-pulse items-center justify-center rounded-lg bg-muted/80">
                        <span className="text-muted-foreground text-sm">Loading waveform…</span>
                    </div>
                )}
                <div ref={waveformRef} />
            </div>

            <div className="flex items-center gap-3">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={togglePlayPause}
                    disabled={isLoading}
                    className="size-9 shrink-0"
                >
                    {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
                </Button>

                <span className="text-muted-foreground w-28 text-sm tabular-nums">
                    {formatTime(currentTime)} / {formatTime(duration)}
                </span>

                <div className="ml-auto flex items-center gap-2">
                    <button
                        onClick={toggleMute}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        {isMuted || volume === 0 ? (
                            <VolumeX className="size-4" />
                        ) : (
                            <Volume2 className="size-4" />
                        )}
                    </button>
                    <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-20 accent-indigo-500"
                    />
                </div>
            </div>
        </div>
    );
}

export default function FilesShow({ file, streamUrl, downloadUrl }: Props) {
    const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);

    function handleDelete() {
        setIsDeleting(true);
        router.delete(filesRoute.destroy(file.id).url, {
            onFinish: () => {
                setIsDeleting(false);
                setShowDeleteDialog(false);
            },
        });
    }

    return (
        <>
            <Head title={file.name} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 lg:p-6">
                <Link
                    href={filesRoute.index().url}
                    className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1.5 text-sm"
                >
                    <ArrowLeft className="size-3.5" />
                    Back to files
                </Link>

                <div className="border-sidebar-border/70 dark:border-sidebar-border flex flex-1 flex-col gap-4 rounded-xl border p-6">
                    {file.type === 'video' ? (
                        <VideoPlayer streamUrl={streamUrl} mimeType={file.mime_type} />
                    ) : (
                        <AudioPlayer streamUrl={streamUrl} />
                    )}

                    <div className="border-t pt-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex flex-col gap-1">
                                <h1 className="text-lg font-semibold">{file.name}</h1>
                                <p className="text-muted-foreground text-sm">
                                    {file.type === 'video' ? 'Video' : 'Audio'} ·{' '}
                                    {formatBytes(file.size)} · {file.mime_type}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                    Uploaded{' '}
                                    {format(parseISO(file.created_at), 'MMM d, yyyy HH:mm')}
                                    {file.folder && ` · ${file.folder.name}`}
                                </p>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                                <a
                                    href={downloadUrl}
                                    download
                                    className="hover:bg-muted flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm"
                                >
                                    <Download className="size-3.5" />
                                    Download
                                </a>
                                <button
                                    onClick={() => setShowDeleteDialog(true)}
                                    className="border-destructive/30 text-destructive hover:bg-destructive/10 flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm"
                                >
                                    <Trash2 className="size-3.5" />
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Dialog
                open={showDeleteDialog}
                onOpenChange={(open) => !open && setShowDeleteDialog(false)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete file</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete{' '}
                            <span className="text-foreground font-medium">{file.name}</span>? This
                            action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowDeleteDialog(false)}
                            disabled={isDeleting}
                        >
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting ? 'Deleting…' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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
