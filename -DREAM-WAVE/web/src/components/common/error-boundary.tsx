"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

import { toUserSafeMessage } from "@/lib/errors";

type ErrorBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
};

type ErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

/**
 * Reusable client error boundary shell.
 * Wire product-specific reporting in a later phase.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    hasError: false,
    message: "",
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: toUserSafeMessage(error),
    };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border p-4 text-sm"
        >
          <p className="font-medium">Unexpected error</p>
          <p className="text-muted-foreground mt-1">{this.state.message}</p>
        </div>
      );
    }

    return this.props.children;
  }
}
