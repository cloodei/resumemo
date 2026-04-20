import { api } from "@/lib/api"
import { getEdenErrorMessage } from "@/lib/errors"

export async function presignProfilingV3Uploads(files: Array<{
	clientId: number
	fileName: string
	mimeType: string
	size: number
}>) {
	const { data, error } = await api.api.v3.sessions.presign.post({ files })
	if (error || !data)
		throw new Error(getEdenErrorMessage(error) ?? "Could not prepare v3 uploads")

	return data
}

export type ProfilingV3PresignResponse = Awaited<ReturnType<typeof presignProfilingV3Uploads>>
