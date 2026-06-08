import { Pause, Play, Volume2, VolumeX } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);

    return `${m}:${s.toString().padStart(2, '0')}`;
}

interface Props {
    streamUrl: string;
    autoPlay?: boolean;
}

export function AudioPlayer({ streamUrl, autoPlay = false }: Props) {
    const waveContainerRef = React.useRef<HTMLDivElement>(null);
    const waveformCanvasRef = React.useRef<HTMLCanvasElement>(null);
    const spectrumCanvasRef = React.useRef<HTMLCanvasElement>(null);

    const timeDisplayRef = React.useRef<HTMLSpanElement>(null);
    const voiceDotRef = React.useRef<HTMLSpanElement>(null);
    const voiceLabelRef = React.useRef<HTMLSpanElement>(null);

    const audioCtxRef = React.useRef<AudioContext | null>(null);
    const gainRef = React.useRef<GainNode | null>(null);
    const audioBufferRef = React.useRef<AudioBuffer | null>(null);
    const sourceRef = React.useRef<AudioBufferSourceNode | null>(null);

    const waveformDataRef = React.useRef<Array<[number, number]>>([]);
    const freqDataRef = React.useRef<Uint8Array<ArrayBuffer>>(new Uint8Array(0));

    const startTimeRef = React.useRef(0);
    const startOffsetRef = React.useRef(0);
    const isPlayingRef = React.useRef(false);
    const volumeRef = React.useRef(0.8);

    const [isLoading, setIsLoading] = React.useState(true);
    const [loadError, setLoadError] = React.useState(false);
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
        const abortController = new AbortController();

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

            const cursorX = Math.floor(progress * width);
            ctx.fillStyle = 'rgba(199,210,254,0.9)';
            ctx.fillRect(cursorX, 0, 2, height);
        }

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
            const displayBins = Math.min(372, freqData.length);
            const barW = width / displayBins;

            ctx.clearRect(0, 0, width, height);

            for (let i = 0; i < displayBins; i++) {
                const value = freqData[i] / 255;
                const barHeight = value * height;
                const hue = 240 + (i / displayBins) * 80;
                ctx.fillStyle = `hsl(${hue}, 70%, ${35 + value * 35}%)`;
                ctx.fillRect(i * barW, height - barHeight, Math.max(1, barW - 0.5), barHeight);
            }
        }

        function updateVoiceIndicator() {
            const freqData = freqDataRef.current;
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

            if (timeDisplayRef.current) {
                timeDisplayRef.current.textContent = `${formatTime(currentTime)} / ${formatTime(buffer.duration)}`;
            }

            drawWaveform(currentTime);
            drawSpectrum();
            updateVoiceIndicator();
        }

        fetch(streamUrl, { signal: abortController.signal })
            .then((r) => r.arrayBuffer())
            .then((buf) => {
                if (cancelled) return;
                return audioCtx.decodeAudioData(buf);
            })
            .then((buffer) => {
                if (!buffer || cancelled) {
                    return;
                }

                audioBufferRef.current = buffer;
                setDuration(buffer.duration);

                const innerW = (waveContainerRef.current?.clientWidth ?? 832) - 32;

                const waveCanvas = waveformCanvasRef.current;
                const specCanvas = spectrumCanvasRef.current;

                if (waveCanvas) {
                    waveCanvas.width = innerW;

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

                if (autoPlay) {
                    startSource(0);
                }
            })
            .catch((err) => {
                if (cancelled || err?.name === 'AbortError') return;
                console.error('Audio load error:', err);
                setIsLoading(false);
                setLoadError(true);
            });

        return () => {
            cancelled = true;
            abortController.abort();
            cancelAnimationFrame(animFrame);
            sourceRef.current?.stop();
            audioCtx.close();
            isPlayingRef.current = false;
            startOffsetRef.current = 0;
        };
    }, [streamUrl]);

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

    if (loadError) {
        return (
            <div className="flex items-center justify-center rounded-lg bg-muted/50 p-8">
                <span className="text-destructive text-sm">Не удалось загрузить аудио</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            <div ref={waveContainerRef} className="rounded-lg bg-muted/50 p-4">
                {isLoading && <Skeleton className="h-20 w-full" />}
                <canvas
                    ref={waveformCanvasRef}
                    height={80}
                    className={cn('block h-20 w-full cursor-pointer', isLoading && 'hidden')}
                    onClick={handleWaveformClick}
                />
            </div>

            <div className="rounded-lg bg-muted/50 p-4">
                <div className="mb-2 flex items-center justify-between">
                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                        Частотный спектр
                    </p>
                    <span className="flex w-32 shrink-0 items-center justify-end gap-1.5">
                        <span ref={voiceDotRef} className="size-1.5 rounded-full bg-muted-foreground/40" />
                        <span ref={voiceLabelRef} className="text-muted-foreground text-xs font-medium">
                            Тишина
                        </span>
                    </span>
                </div>
                {isLoading && <Skeleton className="h-[100px] w-full" />}
                <canvas
                    ref={spectrumCanvasRef}
                    height={100}
                    className={cn('block h-[100px] w-full', isLoading && 'hidden')}
                />
            </div>

            {isLoading ? (
                <div className="flex items-center gap-3">
                    <Skeleton className="size-9 shrink-0 rounded-md" />
                    <Skeleton className="h-4 w-28" />
                    <div className="ml-auto flex items-center gap-2">
                        <Skeleton className="size-4" />
                        <Skeleton className="h-4 w-20" />
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={togglePlayPause}
                        className="size-9 shrink-0"
                    >
                        {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
                    </Button>

                    <span ref={timeDisplayRef} className="text-muted-foreground w-28 text-sm tabular-nums">
                        0:00 / {formatTime(duration)}
                    </span>

                    <div className="ml-auto flex items-center gap-2">
                        <button onClick={toggleMute} className="text-muted-foreground hover:text-foreground">
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
                            className="w-20 accent-primary"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
