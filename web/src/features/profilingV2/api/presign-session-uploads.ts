import { api } from "@/lib/api"
import { getEdenErrorMessage } from "@/lib/errors"

export async function presignScreeningUploads(files: Array<{
	clientId: number
	fileName: string
	mimeType: string
	size: number
}>) {
	const { data, error } = await api.api.v3.sessions.presign.post({ files })
	if (error || !data)
		throw new Error(getEdenErrorMessage(error) ?? "Could not prepare screening uploads")

	return data
}

export type ScreeningPresignResponse = Awaited<ReturnType<typeof presignScreeningUploads>>
