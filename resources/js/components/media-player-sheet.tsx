import * as SheetPrimitive from '@radix-ui/react-dialog';
import { format, parseISO } from 'date-fns';
import { Film, Folder, Music, X } from 'lucide-react';

import { AudioPlayer } from '@/components/players/audio-player';
import { VideoPlayer } from '@/components/players/video-player';
import { useMediaPlayer } from '@/contexts/media-player-context';
import { cn, formatBytes } from '@/lib/utils';

export function MediaPlayerSheet() {
    const { currentMedia, isOpen, close } = useMediaPlayer();

    return (
        <SheetPrimitive.Root open={isOpen} onOpenChange={(open) => !open && close()} modal={false}>
            <SheetPrimitive.Portal>
                <SheetPrimitive.Content
                    onInteractOutside={(e) => e.preventDefault()}
                    onEscapeKeyDown={(e) => e.preventDefault()}
                    className={cn(
                        'bg-background fixed inset-x-0 bottom-0 z-50 flex flex-col gap-4 border-t shadow-lg',
                        'data-[state=open]:animate-in data-[state=closed]:animate-out',
                        'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
                        'data-[state=open]:duration-500 data-[state=closed]:duration-300 transition ease-in-out',
                        currentMedia?.type === 'audio' && 'max-h-[50vh]',
                    )}
                >
                    <div className="flex flex-col gap-1.5 p-4 pb-0 pr-12">
                        <div className="flex items-center gap-2">
                            {currentMedia?.type === 'video' ? (
                                <Film className="size-4 shrink-0 text-blue-500" />
                            ) : (
                                <Music className="size-4 shrink-0 text-purple-500" />
                            )}
                            <SheetPrimitive.Title className="text-foreground truncate text-base font-medium">
                                {currentMedia?.name}
                            </SheetPrimitive.Title>
                        </div>

                        {currentMedia && (
                            <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                                <span>{currentMedia.type === 'video' ? 'Видео' : 'Аудио'}</span>
                                <span>{formatBytes(currentMedia.size)}</span>
                                <span>{currentMedia.mime_type}</span>
                                <span>{format(parseISO(currentMedia.created_at), 'dd.MM.yyyy HH:mm')}</span>
                                {currentMedia.folder && (
                                    <span className="flex items-center gap-1">
                                        <Folder className="size-3 shrink-0" />
                                        {currentMedia.folder.name}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {currentMedia?.type === 'video' ? (
                        <div className="px-4 pb-4">
                            <div className="mx-auto w-full max-w-[min(100%,calc(30vh*16/9))] overflow-hidden rounded-lg">
                                <VideoPlayer
                                    key={currentMedia.id}
                                    streamUrl={currentMedia.streamUrl}
                                    mimeType={currentMedia.mime_type}
                                />
                            </div>
                        </div>
                    ) : currentMedia?.type === 'audio' ? (
                        <div className="overflow-y-auto px-4 pb-4">
                            <AudioPlayer key={currentMedia.id} streamUrl={currentMedia.streamUrl} />
                        </div>
                    ) : null}

                    <SheetPrimitive.Close
                        className="ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
                        onClick={close}
                    >
                        <X className="size-4" />
                        <span className="sr-only">Закрыть</span>
                    </SheetPrimitive.Close>
                </SheetPrimitive.Content>
            </SheetPrimitive.Portal>
        </SheetPrimitive.Root>
    );
}
