
import React, { useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus, AVPlaybackStatusSuccess } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

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
    const video = useRef<Video>(null);
    const [status, setStatus] = useState<AVPlaybackStatus>({} as AVPlaybackStatus);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
        setStatus(status);
        if (status.isLoaded) {
            setIsLoading(false);
        }
        if (status.isLoaded && status.error) {
            setError(status.error);
            setIsLoading(false);
        }
    };

    const handlePlayPause = async () => {
        if (!video.current) return;

        if (status.isLoaded && status.isPlaying) {
            await video.current.pauseAsync();
        } else {
            await video.current.playAsync();
        }
    };

    return (
        <View style={[styles.container, style]}>
            <Video
                ref={video}
                style={styles.video}
                source={{ uri }}
                useNativeControls={useNativeControls}
                resizeMode={resizeMode}
                isLooping={isLooping}
                shouldPlay={shouldPlay}
                onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
                onError={(e) => {
                    console.log('Video Error:', e);
                    setError(e);
                    setIsLoading(false);
                }}
            />

            {isLoading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#fff" />
                </View>
            )}

            {error && (
                <View style={styles.errorOverlay}>
                    <Ionicons name="alert-circle" size={32} color="#fff" />
                </View>
            )}

            {/* Optional Custom Play Button Overlay (if not using native controls or if styled differently) 
          For now, we rely on native controls or tap-to-play could be added here.
      */}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    errorOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
});
