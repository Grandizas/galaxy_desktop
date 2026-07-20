import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Last line of defence — a WebGL or render crash should show a readable
 * message instead of a black window.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[galaxy] unhandled error', error, info.componentStack)
  }

  override render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="grid h-full place-items-center bg-background p-10 text-center">
        <div>
          <h1 className="text-lg font-medium text-danger">The galaxy collapsed</h1>
          <p className="mt-2 max-w-lg font-mono text-[11px] text-content-muted">
            {this.state.error.message}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="mt-6 rounded-lg border border-border px-4 py-2 text-[13px] hover:bg-white/8"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }
}
