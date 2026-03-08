import { Component, type ErrorInfo, type ReactNode } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"

type ErrorBoundaryProps = {
	children: ReactNode
	fallback?: ReactNode
	onReset?: () => void
}

type ErrorBoundaryState = {
	hasError: boolean
	error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	constructor(props: ErrorBoundaryProps) {
		super(props)
		this.state = { hasError: false, error: null }
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { hasError: true, error }
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		console.error("[ErrorBoundary] Uncaught error:", error, info.componentStack)
	}

	handleReset = () => {
		this.props.onReset?.()
		this.setState({ hasError: false, error: null })
	}

	handleReload = () => {
		window.location.reload()
	}

	render() {
		if (this.state.hasError) {
			if (this.props.fallback)
				return this.props.fallback

			return (
				<div className="flex min-h-screen items-center justify-center bg-background px-4">
					<div className="mx-auto flex max-w-md flex-col items-center gap-6 text-center">
						<div className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
							<AlertTriangle className="size-8 text-destructive" />
						</div>

						<div className="space-y-2">
							<h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
							<p className="text-sm text-muted-foreground">
								An unexpected error occurred. You can try again or reload the page.
							</p>
						</div>

						{this.state.error && (
							<pre className="max-h-32 w-full overflow-auto rounded-lg bg-muted/50 p-4 text-left font-mono text-xs text-muted-foreground">
								{this.state.error.message}
							</pre>
						)}

						<div className="flex items-center gap-3">
							<Button variant="outline" onClick={this.handleReset}>Try again</Button>
							<Button onClick={this.handleReload} className="gap-2">
								<RefreshCw className="size-4" />
								Reload page
							</Button>
						</div>
					</div>
				</div>
			)
		}

		return this.props.children
	}
}
