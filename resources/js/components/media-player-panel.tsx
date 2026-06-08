import * as React from 'react';
import { format, parseISO } from 'date-fns';
import { Film, Folder, Music, X } from 'lucide-react';

import { CommentsSection } from '@/components/comments-section';
import { AudioPlayer } from '@/components/players/audio-player';
import { VideoPlayer } from '@/components/players/video-player';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useSidebar } from '@/components/ui/sidebar';
import { useMediaPlayer } from '@/contexts/media-player-context';
import { cn, formatBytes } from '@/lib/utils';

export function MediaPlayerPanel() {
    const { currentMedia, isOpen, comments, commentsLoading, close, refreshComments } = useMediaPlayer();
    const { state, isMobile } = useSidebar();
    const panelRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const el = panelRef.current;
        if (!el) return;

        const observer = new ResizeObserver(([entry]) => {
            document.documentElement.style.setProperty(
                '--media-player-height',
                `${Math.ceil(entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height) + 2}px`,
            );
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [isOpen]);

    if (!isOpen || !currentMedia) {
        return null;
    }

    const leftOffset = isMobile
        ? '0px'
        : state === 'expanded'
          ? 'var(--sidebar-width)'
          : 'var(--sidebar-width-icon)';

    return (
        <div
            ref={panelRef}
            style={{ left: leftOffset, transition: 'left 200ms linear' }}
            className="animate-in slide-in-from-bottom fixed right-0 bottom-0 z-50 flex flex-col gap-4 border-t-2 border-t-primary bg-background p-4 shadow-lg duration-300 lg:p-6"
        >
            <div className="flex items-center gap-2">
                <span className="relative flex size-2.5 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
                </span>
                <p className="text-primary text-xs font-semibold uppercase tracking-wide">
                    Сейчас воспроизводится
                </p>
            </div>

            <div className={cn('grid grid-cols-2 gap-4', currentMedia.type === 'video' && 'lg:flex')}>
                {currentMedia.type === 'video' ? (
                    <div className="col-span-2 shrink-0 overflow-hidden rounded-lg xl:col-span-1">
                        <VideoPlayer
                            key={currentMedia.id}
                            streamUrl={currentMedia.streamUrl}
                            mimeType={currentMedia.mime_type}
                            className="w-full max-w-md"
                        />
                    </div>
                ) : (
                    <div className="col-span-2 xl:col-span-1">
                        <AudioPlayer key={currentMedia.id} streamUrl={currentMedia.streamUrl} />
                    </div>
                )}

                <div className="col-span-2 flex grow min-w-0 shrink flex-col gap-2 xl:col-span-1">
                    <div className="flex items-center gap-2">
                        {currentMedia.type === 'video' ? (
                            <Film className="text-muted-foreground size-4 shrink-0" />
                        ) : (
                            <Music className="text-muted-foreground size-4 shrink-0" />
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

                    <Separator />
                    <CommentsSection
                        fileId={currentMedia.id}
                        comments={comments}
                        loading={commentsLoading}
                        onCommentPosted={refreshComments}
                        onCommentDeleted={refreshComments}
                    />
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
