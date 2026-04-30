import os from "node:os"
import cluster from "node:cluster"
import { apiEnv } from "./src/config/env"

const maxWorkers = Math.max(1, os.availableParallelism())
const workerCount = Math.min(Math.max(1, apiEnv.server.workerCount || 1), maxWorkers)

if (cluster.isPrimary)
	for (let _ = 0; _ < workerCount; ++_)
		cluster.fork()
else
	await import("./src/index")
