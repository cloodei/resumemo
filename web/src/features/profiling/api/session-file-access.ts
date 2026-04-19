import { BASE_URL } from "@/lib/constants"
import { getErrorMessage } from "@/lib/errors"

function isSessionFileAccessPayload(value: unknown): value is { url: string; originalName: string } {
	return typeof value === "object"
		&& value !== null
		&& "url" in value
		&& typeof value.url === "string"
		&& "originalName" in value
		&& typeof value.originalName === "string"
}

async function getSessionFileAccessUrl(args: {
	sessionId: string
	fileId: number
	disposition: "inline" | "attachment"
}) {
	const response = await fetch(
		`${BASE_URL}/api/v2/sessions/${args.sessionId}/files/${args.fileId}/access?disposition=${args.disposition}`,
		{ credentials: "include" },
	)

	let body: unknown = null
	try {
		body = await response.json()
	}
	catch {
		body = null
	}

	if (!response.ok || !isSessionFileAccessPayload(body))
		throw new Error(getErrorMessage(body, `Could not access file (${response.status})`))

	return body
}

export async function openSessionFile(args: { sessionId: string; fileId: number }) {
	const nextWindow = window.open("", "_blank", "noopener,noreferrer")
	try {
		const data = await getSessionFileAccessUrl({ ...args, disposition: "inline" })
		if (nextWindow)
			nextWindow.location.href = data.url
		else
			window.open(data.url, "_blank", "noopener,noreferrer")
		return data
	}
	catch (error) {
		nextWindow?.close()
		throw error
	}
}

export async function downloadSessionFile(args: { sessionId: string; fileId: number }) {
	const data = await getSessionFileAccessUrl({ ...args, disposition: "attachment" })
	const link = document.createElement("a")
	link.href = data.url
	link.download = data.originalName
	document.body.appendChild(link)
	link.click()
	document.body.removeChild(link)
	return data
}
