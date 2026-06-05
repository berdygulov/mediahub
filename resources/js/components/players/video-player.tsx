import Plyr from 'plyr';
import * as React from 'react';

import { cn } from '@/lib/utils';

interface Props {
    streamUrl: string;
    mimeType: string;
    className?: string;
}

export function VideoPlayer({ streamUrl, mimeType, className }: Props) {
    const videoRef = React.useRef<HTMLVideoElement>(null);

    React.useEffect(() => {
        if (!videoRef.current) {
            return;
        }

        let player: Plyr | null = null;
        const frame = requestAnimationFrame(() => {
            if (!videoRef.current) {
                return;
            }

            player = new Plyr(videoRef.current, {
                controls: [
                    'play-large',
                    'play',
                    'progress',
                    'current-time',
                    'duration',
                    'mute',
                    'volume',
                    'pip',
                    'fullscreen',
                    'settings',
                ],
            });
        });

        return () => {
            cancelAnimationFrame(frame);
            player?.destroy();
        };
    }, [streamUrl]);

    return (
        <div className={cn('overflow-hidden rounded-lg', className)}>
            <video ref={videoRef} playsInline>
                <source src={streamUrl} type={mimeType} />
            </video>
        </div>
    );
}
