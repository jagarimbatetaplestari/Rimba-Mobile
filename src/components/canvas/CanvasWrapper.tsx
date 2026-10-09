'use client';

import React, { Component, ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { SceneFallback } from './SceneFallback';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class CanvasErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('3D Canvas encountered an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Dynamically import Three.js scene with ssr: false
const DynamicScene = dynamic(
  () => import('./Scene').then((mod) => mod.Scene),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#CEF4DE] via-[#A2E5BF] to-[#76CCA0]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-600/30 border-t-emerald-600 animate-spin" />
          <span className="text-xs font-medium text-emerald-800/70 tracking-wider">
            Summoning Rimba Island...
          </span>
        </div>
      </div>
    ),
  }
);

export function CanvasWrapper({ isPaused = false }: { isPaused?: boolean }) {
  return (
    <CanvasErrorBoundary fallback={<SceneFallback />}>
      <DynamicScene isPaused={isPaused} />
    </CanvasErrorBoundary>
  );
}
