
import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { VideoView, useVideoPlayer, type VideoContentFit } from 'expo-video';
import {
    getAppPreferences,
    getCachedAppPreferences,
    subscribeAppPreferences,
} from '@/services/appPreferences';

export enum ResizeMode {
    CONTAIN = 'contain',
    COVER = 'cover',
    STRETCH = 'stretch',
}

interface VideoPlayerProps {
    uri: string;
    style?: any;
    resizeMode?: ResizeMode;
    shouldPlay?: boolean;
    isLooping?: boolean;
    useNativeControls?: boolean;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
    uri,
    style,
    resizeMode = ResizeMode.CONTAIN,
    shouldPlay = false,
    isLooping = false,
    useNativeControls = true,
}) => {
    const [autoPlayEnabled, setAutoPlayEnabled] = useState(
        getCachedAppPreferences().autoPlayVideos
    );
    const effectiveShouldPlay = shouldPlay && autoPlayEnabled;

    const player = useVideoPlayer(uri, (player) => {
        player.loop = isLooping;
        if (effectiveShouldPlay) player.play();
    });

    useEffect(() => {
        let mounted = true;

        getAppPreferences()
            .then((preferences) => {
                if (mounted) {
                    setAutoPlayEnabled(preferences.autoPlayVideos);
                }
            })
            .catch(() => {});

        const unsubscribe = subscribeAppPreferences((preferences) => {
            if (mounted) {
                setAutoPlayEnabled(preferences.autoPlayVideos);
            }
        });

        return () => {
            mounted = false;
            unsubscribe();
        };
    }, []);

    useEffect(() => {
        player.loop = isLooping;
        if (effectiveShouldPlay) {
            player.play();
        } else {
            player.pause();
        }
    }, [effectiveShouldPlay, isLooping, player]);

    const contentFit: VideoContentFit =
        resizeMode === ResizeMode.COVER ? 'cover' :
            resizeMode === ResizeMode.STRETCH ? 'fill' :
                'contain';

    return (
        <VideoView
            player={player}
            style={[styles.video, style]}
            nativeControls={useNativeControls}
            contentFit={contentFit}
            allowsFullscreen
        />
    );
};

const styles = StyleSheet.create({
    video: {
        backgroundColor: '#000',
        overflow: 'hidden',
    },
});
