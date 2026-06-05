import Plyr from 'plyr';
import * as React from 'react';

interface Props {
    streamUrl: string;
    mimeType: string;
}

export function VideoPlayer({ streamUrl, mimeType }: Props) {
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
        <div className="overflow-hidden rounded-lg">
            <video ref={videoRef} playsInline>
                <source src={streamUrl} type={mimeType} />
            </video>
        </div>
    );
}
