import os from 'node:os'
import cluster from 'node:cluster'

if (cluster.isPrimary)
  for (let i = 0; i < os.availableParallelism(); ++i)
    cluster.fork()
else
  await import("src/index")
