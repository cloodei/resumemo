import os from "node:os"
import cluster from "node:cluster"

const requestedWorkers = parseInt(process.env.API_WORKER_COUNT ?? "1", 10)
const maxWorkers = Math.max(1, os.availableParallelism())
const workerCount = Math.min(Math.max(1, requestedWorkers || 1), maxWorkers)

if (cluster.isPrimary)
	for (let i = 0; i < workerCount; ++i)
		cluster.fork()
else
	await import("src/index")
