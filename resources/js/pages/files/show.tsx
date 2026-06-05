import { Head, Link, router, usePage } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Download, Pause, Play, Trash2, Volume2, VolumeX } from 'lucide-react';
import Plyr from 'plyr';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { formatBytes } from '@/lib/utils';
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


function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);

    return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Video Player (Plyr) ──────────────────────────────────────────────────────

function VideoPlayer({ streamUrl, mimeType }: { streamUrl: string; mimeType: string }) {
    const videoRef = React.useRef<HTMLVideoElement>(null);

    React.useEffect(() => {
        if (!videoRef.current) return;

        let player: Plyr | null = null;
        const frame = requestAnimationFrame(() => {
            if (!videoRef.current) return;
            player = new Plyr(videoRef.current, {
                controls: ['play-large', 'play', 'progress', 'current-time', 'duration', 'mute', 'volume', 'pip', 'fullscreen', 'settings'],
            });
        });

        return () => {
            cancelAnimationFrame(frame);
            player?.destroy();
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

// ─── Audio Player (Web Audio API) ────────────────────────────────────────────

function AudioPlayer({ streamUrl }: { streamUrl: string }) {
    // Container / canvas refs
    const waveContainerRef = React.useRef<HTMLDivElement>(null);
    const waveformCanvasRef = React.useRef<HTMLCanvasElement>(null);
    const spectrumCanvasRef = React.useRef<HTMLCanvasElement>(null);

    // DOM refs updated in rAF loop (bypasses React re-renders at 60 fps)
    const timeDisplayRef = React.useRef<HTMLSpanElement>(null);
    const voiceDotRef = React.useRef<HTMLSpanElement>(null);
    const voiceLabelRef = React.useRef<HTMLSpanElement>(null);

    // Web Audio API refs
    const audioCtxRef = React.useRef<AudioContext | null>(null);
    const gainRef = React.useRef<GainNode | null>(null);
    const audioBufferRef = React.useRef<AudioBuffer | null>(null);
    const sourceRef = React.useRef<AudioBufferSourceNode | null>(null);

    // Precomputed waveform data: [min, max] per horizontal pixel
    const waveformDataRef = React.useRef<Array<[number, number]>>([]);
    // Reused buffer for frequency data (avoids allocation per frame)
    const freqDataRef = React.useRef<Uint8Array<ArrayBuffer>>(new Uint8Array(0));

    // Playback tracking
    const startTimeRef = React.useRef(0);
    const startOffsetRef = React.useRef(0);
    const isPlayingRef = React.useRef(false);
    const volumeRef = React.useRef(0.8);

    // React state — only for things that change rendered structure
    const [isLoading, setIsLoading] = React.useState(true);
    const [isPlaying, setIsPlaying] = React.useState(false);
    const [duration, setDuration] = React.useState(0);
    const [volume, setVolume] = React.useState(0.8);
    const [isMuted, setIsMuted] = React.useState(false);

    React.useEffect(() => {
        const audioCtx = new AudioContext();
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.8;

        const gain = audioCtx.createGain();
        gain.gain.value = volumeRef.current;
        gain.connect(analyser);
        analyser.connect(audioCtx.destination);

        audioCtxRef.current = audioCtx;
        gainRef.current = gain;
        freqDataRef.current = new Uint8Array(analyser.frequencyBinCount);

        let cancelled = false;
        let animFrame = 0;

        // ── Waveform rendering ──────────────────────────────────────────────

        function drawWaveform(currentTime: number) {
            const canvas = waveformCanvasRef.current;
            const precomputed = waveformDataRef.current;

            if (!canvas || precomputed.length === 0) {
                return;
            }

            const ctx = canvas.getContext('2d');

            if (!ctx) {
                return;
            }

            const { width, height } = canvas;
            const dur = audioBufferRef.current?.duration ?? 1;
            const progress = Math.min(currentTime / dur, 1);
            const center = height / 2;

            ctx.clearRect(0, 0, width, height);

            for (let i = 0; i < precomputed.length; i++) {
                const [min, max] = precomputed[i];
                const yTop = center * (1 - max);
                const yBot = center * (1 - min);
                ctx.fillStyle = i / precomputed.length <= progress ? '#4f46e5' : '#818cf8';
                ctx.fillRect(i, yTop, 1, Math.max(1, yBot - yTop));
            }

            // Playback cursor
            const cursorX = Math.floor(progress * width);
            ctx.fillStyle = 'rgba(199,210,254,0.9)';
            ctx.fillRect(cursorX, 0, 2, height);
        }

        // ── Frequency spectrum rendering ────────────────────────────────────

        function drawSpectrum() {
            const canvas = spectrumCanvasRef.current;

            if (!canvas) {
                return;
            }

            const ctx = canvas.getContext('2d');

            if (!ctx) {
                return;
            }

            analyser.getByteFrequencyData(freqDataRef.current);
            const freqData = freqDataRef.current;

            const { width, height } = canvas;
            // Display 0–8 kHz: binWidth ≈ 21.5 Hz → bin 372 ≈ 8000 Hz
            const displayBins = Math.min(372, freqData.length);
            const barW = width / displayBins;

            ctx.clearRect(0, 0, width, height);

            for (let i = 0; i < displayBins; i++) {
                const value = freqData[i] / 255;
                const barHeight = value * height;
                // Hue: 240 (indigo/low) → 320 (pink/high)
                const hue = 240 + (i / displayBins) * 80;
                ctx.fillStyle = `hsl(${hue}, 70%, ${35 + value * 35}%)`;
                ctx.fillRect(i * barW, height - barHeight, Math.max(1, barW - 0.5), barHeight);
            }
        }

        // ── Voice detection ─────────────────────────────────────────────────

        function updateVoiceIndicator() {
            const freqData = freqDataRef.current;
            // Voice range 80–1000 Hz: bins 4–47 (fftSize=2048, sampleRate=44100)
            const voiceSlice = freqData.slice(4, 47);
            const avg = voiceSlice.reduce((a, b) => a + b, 0) / voiceSlice.length;
            const isVoice = avg > 30;

            if (voiceDotRef.current) {
                voiceDotRef.current.className = isVoice
                    ? 'size-1.5 rounded-full bg-green-500 animate-pulse'
                    : 'size-1.5 rounded-full bg-muted-foreground/40';
            }

            if (voiceLabelRef.current) {
                voiceLabelRef.current.textContent = isVoice ? 'Голос обнаружен' : 'Тишина';
                voiceLabelRef.current.className = isVoice
                    ? 'text-xs font-medium text-green-500'
                    : 'text-xs font-medium text-muted-foreground';
            }
        }

        // ── rAF loop ────────────────────────────────────────────────────────

        function tick() {
            animFrame = requestAnimationFrame(tick);

            const buffer = audioBufferRef.current;

            if (!buffer) {
                return;
            }

            let currentTime = startOffsetRef.current;

            if (isPlayingRef.current) {
                currentTime = Math.min(
                    startOffsetRef.current + (audioCtx.currentTime - startTimeRef.current),
                    buffer.duration,
                );
            }

            // Update time display directly — avoids 60 fps React re-renders
            if (timeDisplayRef.current) {
                timeDisplayRef.current.textContent = `${formatTime(currentTime)} / ${formatTime(buffer.duration)}`;
            }

            drawWaveform(currentTime);
            drawSpectrum();
            updateVoiceIndicator();
        }

        // ── Load audio ──────────────────────────────────────────────────────

        fetch(streamUrl)
            .then((r) => r.arrayBuffer())
            .then((buf) => audioCtx.decodeAudioData(buf))
            .then((buffer) => {
                if (cancelled) {
                    return;
                }

                audioBufferRef.current = buffer;
                setDuration(buffer.duration);

                // Size canvases to match container (subtract p-4 = 32px)
                const innerW = (waveContainerRef.current?.clientWidth ?? 832) - 32;

                const waveCanvas = waveformCanvasRef.current;
                const specCanvas = spectrumCanvasRef.current;

                if (waveCanvas) {
                    waveCanvas.width = innerW;

                    // Precompute waveform: one [min,max] pair per pixel column
                    const data = buffer.getChannelData(0);
                    const blockSize = Math.floor(data.length / innerW);
                    const precomputed: Array<[number, number]> = [];

                    for (let i = 0; i < innerW; i++) {
                        let min = 1,
                            max = -1;
                        const base = i * blockSize;

                        for (let j = 0; j < blockSize; j++) {
                            const s = data[base + j] ?? 0;

                            if (s < min) {
                                min = s;
                            }

                            if (s > max) {
                                max = s;
                            }
                        }

                        precomputed.push([min, max]);
                    }

                    waveformDataRef.current = precomputed;
                }

                if (specCanvas) {
                    specCanvas.width = innerW;
                }

                setIsLoading(false);
                animFrame = requestAnimationFrame(tick);
            })
            .catch((err) => {
                if (!cancelled) {
                    console.error('Audio load error:', err);
                }
            });

        return () => {
            cancelled = true;
            cancelAnimationFrame(animFrame);
            sourceRef.current?.stop();
            audioCtx.close();
            isPlayingRef.current = false;
            startOffsetRef.current = 0;
        };
    }, [streamUrl]);

    // ── Playback control ──────────────────────────────────────────────────────

    function startSource(offset: number) {
        const audioCtx = audioCtxRef.current;
        const gain = gainRef.current;
        const buffer = audioBufferRef.current;

        if (!audioCtx || !gain || !buffer) {
            return;
        }

        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(gain);

        const thisSource = source;
        source.onended = () => {
            if (sourceRef.current === thisSource && isPlayingRef.current) {
                isPlayingRef.current = false;
                startOffsetRef.current = 0;
                setIsPlaying(false);
            }
        };

        source.start(0, Math.min(offset, buffer.duration));
        sourceRef.current = source;
        startTimeRef.current = audioCtx.currentTime;
        isPlayingRef.current = true;
        setIsPlaying(true);
    }

    function stopSource() {
        const audioCtx = audioCtxRef.current;
        const buffer = audioBufferRef.current;

        if (!audioCtx || !buffer) {
            return;
        }

        startOffsetRef.current = Math.min(
            startOffsetRef.current + (audioCtx.currentTime - startTimeRef.current),
            buffer.duration,
        );

        isPlayingRef.current = false;
        const src = sourceRef.current;
        sourceRef.current = null;
        src?.stop();
        setIsPlaying(false);
    }

    function togglePlayPause() {
        if (isPlayingRef.current) {
            stopSource();
        } else {
            startSource(startOffsetRef.current);
        }
    }

    function handleWaveformClick(e: React.MouseEvent<HTMLCanvasElement>) {
        const canvas = waveformCanvasRef.current;
        const buffer = audioBufferRef.current;

        if (!canvas || !buffer) {
            return;
        }

        const rect = canvas.getBoundingClientRect();
        const seekTime = ((e.clientX - rect.left) / rect.width) * buffer.duration;

        if (isPlayingRef.current) {
            const src = sourceRef.current;
            sourceRef.current = null;
            isPlayingRef.current = false;
            src?.stop();
            startOffsetRef.current = seekTime;
            startSource(seekTime);
        } else {
            startOffsetRef.current = seekTime;
        }
    }

    function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
        const val = parseFloat(e.target.value);
        setVolume(val);
        volumeRef.current = val;

        if (gainRef.current) {
            gainRef.current.gain.value = val;
        }

        if (val > 0) {
            setIsMuted(false);
        }
    }

    function toggleMute() {
        const next = !isMuted;
        setIsMuted(next);

        if (gainRef.current) {
            gainRef.current.gain.value = next ? 0 : volumeRef.current;
        }
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col gap-3">
            {/* Waveform */}
            <div ref={waveContainerRef} className="relative rounded-lg bg-muted/50 p-4">
                {isLoading && (
                    <div className="absolute inset-0 z-10 flex animate-pulse items-center justify-center rounded-lg bg-muted/80">
                        <span className="text-muted-foreground text-sm">Загрузка…</span>
                    </div>
                )}
                <canvas
                    ref={waveformCanvasRef}
                    height={80}
                    className="block w-full cursor-pointer"
                    onClick={handleWaveformClick}
                />
            </div>

            {/* Frequency spectrum + voice detection */}
            <div className="rounded-lg bg-muted/50 p-4">
                <div className="mb-2 flex items-center justify-between">
                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                        Частотный спектр
                    </p>
                    <span className="flex items-center gap-1.5">
                        <span
                            ref={voiceDotRef}
                            className="size-1.5 rounded-full bg-muted-foreground/40"
                        />
                        <span
                            ref={voiceLabelRef}
                            className="text-muted-foreground text-xs font-medium"
                        >
                            Тишина
                        </span>
                    </span>
                </div>
                <div className="relative">
                    {isLoading && (
                        <div className="absolute inset-0 z-10 animate-pulse rounded bg-muted" />
                    )}
                    <canvas ref={spectrumCanvasRef} height={100} className="block w-full" />
                </div>
            </div>

            {/* Controls */}
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

                <span
                    ref={timeDisplayRef}
                    className="text-muted-foreground w-28 text-sm tabular-nums"
                >
                    0:00 / {formatTime(duration)}
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FilesShow({ file, streamUrl, downloadUrl }: Props) {
    const { auth } = usePage().props;
    const isAdmin = auth.user.is_admin;

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
                    Назад к файлам
                </Link>

                <div className="border-sidebar-border/70 dark:border-sidebar-border grid grid-cols-2 gap-4 rounded-xl border p-6">
                    <div className="col-span-2 xl:col-span-1">
                        {file.type === 'video' ? (
                            <VideoPlayer streamUrl={streamUrl} mimeType={file.mime_type} />
                        ) : (
                            <AudioPlayer streamUrl={streamUrl} />
                        )}
                    </div>
                    <div className="col-span-2 xl:col-span-1">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="flex flex-col gap-1">
                                <h1 className="text-lg font-semibold">{file.name}</h1>
                                <p className="text-muted-foreground text-sm">
                                    {file.type === 'video' ? 'Видео' : 'Аудио'} ·{' '}
                                    {formatBytes(file.size)} · {file.mime_type}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                    Загружен:{' '}
                                    {format(parseISO(file.created_at), 'dd.MM.yyyy HH:mm')}
                                    {file.folder && (
                                        <>
                                            <br />
                                            Папка: {file.folder.name}
                                        </>
                                    )}
                                </p>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                                <a
                                    href={downloadUrl}
                                    download
                                    className="hover:bg-muted flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm"
                                >
                                    <Download className="size-3.5" />
                                    Скачать
                                </a>
                                {isAdmin && (
                                    <button
                                        onClick={() => setShowDeleteDialog(true)}
                                        className="border-destructive/30 text-destructive hover:bg-destructive/10 flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm"
                                    >
                                        <Trash2 className="size-3.5" />
                                        Удалить
                                    </button>
                                )}
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
                        <DialogTitle>Удалить файл</DialogTitle>
                        <DialogDescription>
                            Вы уверены, что хотите удалить{' '}
                            <span className="text-foreground font-medium">{file.name}</span>? Это
                            действие нельзя отменить.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowDeleteDialog(false)}
                            disabled={isDeleting}
                        >
                            Отмена
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting ? 'Удаление…' : 'Удалить'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

FilesShow.layout = {
    breadcrumbs: [
        { title: 'Главная', href: dashboard() },
        { title: 'Файлы', href: filesRoute.index() },
        { title: 'Просмотр файла', href: '#' },
    ],
};
