import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary — catches React rendering errors in production builds
 * and displays a human-readable error screen instead of a blank white screen.
 */
class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
        this.setState({ errorInfo });
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;
            return (
                <View style={styles.container}>
                    <Text style={styles.title}><AutoI18nText i18nKey="auto.mobile.components_common_ErrorBoundary.k_9fc09b1c" /></Text>
                    <Text style={styles.subtitle}>
                        <AutoI18nText i18nKey="auto.mobile.components_common_ErrorBoundary.k_147f9724" />
                    </Text>
                    <ScrollView style={styles.errorBox}>
                        <Text style={styles.errorText}>
                            {this.state.error?.toString()}
                        </Text>
                        {this.state.errorInfo && (
                            <Text style={styles.stackText}>
                                {this.state.errorInfo.componentStack}
                            </Text>
                        )}
                    </ScrollView>
                    <TouchableOpacity style={styles.button} onPress={this.handleReset}>
                        <Text style={styles.buttonText}><AutoI18nText i18nKey="auto.mobile.components_common_ErrorBoundary.k_d8814e16" /></Text>
                    </TouchableOpacity>
                </View>
            );
        }
        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
        paddingTop: 60,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#d00',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#555',
        marginBottom: 16,
    },
    errorBox: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
    },
    errorText: {
        fontSize: 13,
        color: '#d00',
        fontFamily: 'monospace',
        marginBottom: 8,
    },
    stackText: {
        fontSize: 11,
        color: '#555',
        fontFamily: 'monospace',
    },
    button: {
        backgroundColor: '#007AFF',
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
});

export default ErrorBoundary;
