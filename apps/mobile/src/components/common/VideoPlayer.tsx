
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { VideoView, useVideoPlayer, type VideoContentFit } from 'expo-video';

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
    const player = useVideoPlayer(uri, (player) => {
        player.loop = isLooping;
        if (shouldPlay) player.play();
    });

    useEffect(() => {
        player.loop = isLooping;
        if (shouldPlay) {
            player.play();
        } else {
            player.pause();
        }
    }, [isLooping, player, shouldPlay]);

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
