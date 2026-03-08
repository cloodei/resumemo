import { QueryErrorResetBoundary } from "@tanstack/react-query"

import { ErrorBoundary } from "@/components/feedback/error-boundary"

type QueryErrorBoundaryProps = {
	children: React.ReactNode
	fallback: React.ReactNode
}

export function QueryErrorBoundary({ children, fallback }: QueryErrorBoundaryProps) {
	return (
		<QueryErrorResetBoundary>
			{({ reset }) => (
				<ErrorBoundary fallback={fallback} onReset={reset}>
					{children}
				</ErrorBoundary>
			)}
		</QueryErrorResetBoundary>
	)
}
