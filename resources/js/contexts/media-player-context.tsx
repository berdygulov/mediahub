import * as React from 'react';

export interface MediaItem {
    id: number;
    name: string;
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
    play: (media: MediaItem) => void;
    close: () => void;
}

const MediaPlayerContext = React.createContext<MediaPlayerContextValue | null>(null);

export function MediaPlayerProvider({ children }: { children: React.ReactNode }) {
    const [currentMedia, setCurrentMedia] = React.useState<MediaItem | null>(null);
    const [isOpen, setIsOpen] = React.useState(false);

    const play = React.useCallback((media: MediaItem) => {
        setCurrentMedia(media);
        setIsOpen(true);
    }, []);

    const close = React.useCallback(() => {
        setIsOpen(false);
    }, []);

    return (
        <MediaPlayerContext.Provider value={{ currentMedia, isOpen, play, close }}>
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
