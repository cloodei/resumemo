import { Elysia, t } from "elysia";

export const randomRoutes = new Elysia({ prefix: "/67/random" })
	.get("/", () => {
		return {
			message: "Hello World",
		}
	})
	.post("/test", ({ body }) => {
		console.log("Received test data:", body)
		return {
			message: "Test endpoint received data successfully",
			received: {
				name: body.name,
				jobTitle: body.jobTitle,
				jobDescription: body.jobDescription?.slice(0, 100) + "...",
				fileCount: body.files.length ?? 0,
				hashCount: body.hashes ? JSON.parse(body.hashes).length : 0,
			}
		}
	}, {
		body: t.Object({
			name: t.String(),
			jobDescription: t.String(),
			jobTitle: t.String(),
			hashes: t.String(),
			files: t.Files({
				maxFiles: 50,
				maxSize: 2 * 1024 * 1024,
			}),
		})
	})
