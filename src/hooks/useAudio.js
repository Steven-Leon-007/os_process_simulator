import { Howl } from 'howler';
import { useCallback } from 'react';

export default function useAudio(src, enabled = true) {
    const play = useCallback(() => {
        if (enabled) {
            const sound = new Howl({ src: [src] });
            sound.play();
        }
    }, [src, enabled]);

    return play;
}