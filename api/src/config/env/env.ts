const DEFAULT_FRONTEND_ORIGINS = [
	"http://localhost:5000",
	"http://localhost:3000",
	"http://localhost:5173",
	"http://localhost:5174",
]

const DEFAULT_PIPELINE_SECRET_HEADER_NAME = "x-pipeline-secret"
const DEFAULT_CELERY_BROKER_URL = "amqp://resumemo:resumemo@localhost:5672//"
const DEFAULT_R2_BUCKET_NAME = "resumemo-uploads"
const DEFAULT_BETTER_AUTH_URL = "http://localhost:8080"

function parseCsv(value: string | undefined, fallback: string[]) {
	const parsed = value
		?.split(",")
		.map(item => item.trim())
		.filter(Boolean)

	return parsed && parsed.length > 0 ? parsed : fallback
}

function parseWorkerCount(value: string | undefined) {
	const parsed = Number.parseInt(value ?? "1", 10)
	if (!Number.isFinite(parsed) || parsed < 1)
		return 1

	return parsed
}

export const apiEnv = {
	server: {
		workerCount: parseWorkerCount(process.env.API_WORKER_COUNT),
		frontendOrigins: parseCsv(process.env.FRONTEND_URLS ?? process.env.FRONTEND_URL, DEFAULT_FRONTEND_ORIGINS),
	},
	database: {
		url: process.env.DATABASE_URL ?? "",
	},
	pipeline: {
		secretHeaderName: (process.env.PIPELINE_SECRET_HEADER_NAME ?? DEFAULT_PIPELINE_SECRET_HEADER_NAME).toLowerCase(),
		callbackSecret: process.env.PIPELINE_CALLBACK_SECRET ?? "",
	},
	queue: {
		brokerUrl: process.env.CELERY_BROKER_URL ?? DEFAULT_CELERY_BROKER_URL,
	},
	storage: {
		accountId: process.env.R2_ACCOUNT_ID ?? "",
		accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
		secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
		bucketName: process.env.R2_BUCKET_NAME ?? DEFAULT_R2_BUCKET_NAME,
	},
	auth: {
		useCrossSiteCookies: process.env.AUTH_COOKIE_CROSS_SITE === "true",
		secret: process.env.BETTER_AUTH_SECRET ?? "",
		baseUrl: process.env.BETTER_AUTH_URL ?? DEFAULT_BETTER_AUTH_URL,
		googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
		googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
		githubClientId: process.env.GITHUB_CLIENT_ID ?? "",
		githubClientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
	},
	jwt: {
		secret: process.env.JWT_SECRET,
	},
} as const
