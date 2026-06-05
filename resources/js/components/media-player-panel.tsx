import { format, parseISO } from 'date-fns';
import { Film, Folder, Music, X } from 'lucide-react';

import { AudioPlayer } from '@/components/players/audio-player';
import { VideoPlayer } from '@/components/players/video-player';
import { Button } from '@/components/ui/button';
import { useMediaPlayer } from '@/contexts/media-player-context';
import { formatBytes } from '@/lib/utils';

export function MediaPlayerPanel() {
    const { currentMedia, isOpen, close } = useMediaPlayer();

    if (!isOpen || !currentMedia) {
        return null;
    }

    return (
        <div className="animate-in slide-in-from-bottom sticky bottom-0 z-10 border-t bg-background shadow-lg duration-300 p-4 lg:p-6 flex flex-col gap-4">
            <p className="text-muted-foreground text-xs font-medium tracking-wide">
                Сейчас воспроизводится
            </p>
            <div className={`grid grid-cols-2 gap-4 ${currentMedia.type === 'video' ? 'lg:flex' : ''}`}>
                {currentMedia.type === 'video' ? (
                    <div className="col-span-2 xl:col-span-1 overflow-hidden rounded-lg">
                        <VideoPlayer
                            key={currentMedia.id}
                            streamUrl={currentMedia.streamUrl}
                            mimeType={currentMedia.mime_type}
                            className="w-full max-w-lg"
                        />
                    </div>
                ) : (
                    <div className="col-span-2 xl:col-span-1">
                        <AudioPlayer key={currentMedia.id} streamUrl={currentMedia.streamUrl} />
                    </div>
                )}

                <div className="col-span-2 xl:col-span-1 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                        {currentMedia.type === 'video' ? (
                            <Film className="size-4 shrink-0 text-blue-500" />
                        ) : (
                            <Music className="size-4 shrink-0 text-purple-500" />
                        )}
                        <span className="text-foreground truncate text-base font-medium">
                        {currentMedia.name}
                    </span>
                    </div>

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
                </div>
            </div>

            <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-4 size-7"
                onClick={close}
            >
                <X className="size-4" />
            </Button>
        </div>
    );
}
