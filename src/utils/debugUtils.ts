/**
 * Utility for debugging and logging errors in the application.
 * This should be used to capture non-fatal errors that might affect user experience.
 */

export const debugLog = (category: string, message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${category}] ${message}`;

    console.log(logEntry, data || '');

    // Here we could also send this to an external logging service like Sentry or LogRocket
};

export const debugError = (category: string, error: any, context?: any) => {
    const timestamp = new Date().toISOString();
    const errorMessage = error?.message || error?.toString() || 'Unknown Error';
    const logEntry = `[${timestamp}] [${category}] ERROR: ${errorMessage}`;

    console.error(logEntry, {
        error,
        context: context || {},
        stack: error?.stack
    });
};

export const monitorNetworkState = () => {
    if (typeof window !== 'undefined') {
        window.addEventListener('online', () => {
            debugLog('NETWORK', 'Browser is Online');
        });
        window.addEventListener('offline', () => {
            debugLog('NETWORK', 'Browser is Offline');
        });
    }
};
