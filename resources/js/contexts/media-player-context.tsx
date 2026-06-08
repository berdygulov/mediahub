import * as React from 'react';

import { Comment } from '@/components/comments-section';
import * as fileCommentsRoute from '@/actions/App/Http/Controllers/FileCommentController';

export interface MediaItem {
    id: number;
    name: string;
    description?: string | null;
    type: 'video' | 'audio';
    mime_type: string;
    size: number;
    created_at: string;
    folder: { name: string } | null;
    streamUrl: string;
}

interface MediaPlayerContextValue {
    currentMedia: MediaItem | null;
    isOpen: boolean;
    comments: Comment[];
    commentsLoading: boolean;
    play: (media: MediaItem) => void;
    close: () => void;
    refreshComments: () => void;
}

const MediaPlayerContext = React.createContext<MediaPlayerContextValue | null>(null);

export function MediaPlayerProvider({ children }: { children: React.ReactNode }) {
    const [currentMedia, setCurrentMedia] = React.useState<MediaItem | null>(null);
    const [isOpen, setIsOpen] = React.useState(false);
    const [comments, setComments] = React.useState<Comment[]>([]);
    const [commentsLoading, setCommentsLoading] = React.useState(false);

    const fetchingForRef = React.useRef<number | null>(null);

    const play = React.useCallback((media: MediaItem) => {
        setCurrentMedia(media);
        setIsOpen(true);
        setComments([]);
        setCommentsLoading(true);
        fetchingForRef.current = media.id;

        fetch(fileCommentsRoute.index(media.id).url)
            .then((r) => r.json())
            .then((data: Comment[]) => {
                if (fetchingForRef.current !== media.id) return;
                setComments(data);
                setCommentsLoading(false);
            })
            .catch((err) => {
                if (fetchingForRef.current !== media.id) return;
                console.error('Failed to load comments:', err);
                setCommentsLoading(false);
            });
    }, []);

    const close = React.useCallback(() => {
        setIsOpen(false);
    }, []);

    const refreshComments = React.useCallback(() => {
        if (!currentMedia) return;
        const id = currentMedia.id;
        setCommentsLoading(true);
        fetchingForRef.current = id;

        fetch(fileCommentsRoute.index(id).url)
            .then((r) => r.json())
            .then((data: Comment[]) => {
                if (fetchingForRef.current !== id) return;
                setComments(data);
                setCommentsLoading(false);
            })
            .catch((err) => {
                if (fetchingForRef.current !== id) return;
                console.error('Failed to load comments:', err);
                setCommentsLoading(false);
            });
    }, [currentMedia]);

    return (
        <MediaPlayerContext.Provider value={{ currentMedia, isOpen, comments, commentsLoading, play, close, refreshComments }}>
            {children}
        </MediaPlayerContext.Provider>
    );
}

export function useMediaPlayer(): MediaPlayerContextValue {
    const ctx = React.useContext(MediaPlayerContext);

    if (!ctx) {
        throw new Error('useMediaPlayer must be used within MediaPlayerProvider');
    }

    return ctx;
}
