import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onReset?: () => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary Component
 * 
 * Catches JavaScript errors anywhere in child component tree,
 * logs them, and displays a fallback UI.
 * 
 * Usage:
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 * 
 * Or with custom fallback:
 * <ErrorBoundary fallback={<CustomError />}>
 *   <MyComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        // Update state so next render shows fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log error to console
        console.error('🚨 ErrorBoundary caught an error:', error, errorInfo);

        this.setState({ errorInfo });

        // TODO: Send to Sentry or other error tracking service
        // Sentry.captureException(error, { extra: errorInfo });
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        });

        if (this.props.onReset) {
            this.props.onReset();
        }
    };

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default fallback UI - Warm Cafe Style
            return (
                <div className="min-h-[300px] flex items-center justify-center p-6">
                    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-red-100 overflow-hidden">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-red-500 to-rose-500 p-6 text-white">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                    <AlertTriangle size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">เกิดข้อผิดพลาด</h2>
                                    <p className="text-red-100 text-sm">Something went wrong</p>
                                </div>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-4">
                            <p className="text-stone-600">
                                ขออภัย เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง
                            </p>

                            {/* Error Details (Collapsible in production) */}
                            {this.state.error && (
                                <details className="bg-red-50 rounded-lg p-3 text-sm">
                                    <summary className="text-red-600 cursor-pointer font-medium">
                                        รายละเอียด Error
                                    </summary>
                                    <pre className="mt-2 text-red-700 overflow-auto text-xs">
                                        {this.state.error.toString()}
                                        {this.state.errorInfo?.componentStack}
                                    </pre>
                                </details>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={this.handleReset}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
                                >
                                    <RefreshCw size={18} />
                                    ลองใหม่
                                </button>
                                <button
                                    onClick={this.handleReload}
                                    className="flex-1 px-4 py-3 bg-stone-100 text-stone-700 rounded-xl font-medium hover:bg-stone-200 transition-all flex items-center justify-center gap-2"
                                >
                                    <Home size={18} />
                                    รีเฟรช
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * Page-level ErrorBoundary with simpler fallback
 */
export const PageErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
    <ErrorBoundary
        fallback={
            <div className="p-8 text-center">
                <AlertTriangle className="mx-auto h-12 w-12 text-red-400 mb-4" />
                <h3 className="text-lg font-semibold text-stone-800 mb-2">
                    ไม่สามารถโหลดหน้านี้ได้
                </h3>
                <p className="text-stone-500 mb-4">
                    กรุณารีเฟรชหน้าเว็บ หรือลองใหม่ภายหลัง
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                >
                    รีเฟรช
                </button>
            </div>
        }
    >
        {children}
    </ErrorBoundary>
);

export default ErrorBoundary;
