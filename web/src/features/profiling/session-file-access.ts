import { BASE_URL } from "../../lib/constants"
import { getErrorMessage } from "../../lib/errors"

type FileDisposition = "inline" | "attachment"

type SessionFileAccessResponse = {
	url: string
	disposition: FileDisposition
	fileId: number
	originalName: string
	mimeType: string
	expiresInSeconds: number
}

async function getSessionFileAccessUrl(args: {
	sessionId: string
	fileId: number
	disposition: FileDisposition
}) {
	const response = await fetch(
		`${BASE_URL}/api/v2/sessions/${args.sessionId}/files/${args.fileId}/access?disposition=${args.disposition}`,
		{ credentials: "include" },
	)

	let body: SessionFileAccessResponse | { message?: string } | null = null
	try {
		body = await response.json()
	}
	catch {
		body = null
	}

	if (!response.ok || !body || typeof body !== "object" || !("url" in body) || typeof body.url !== "string")
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
