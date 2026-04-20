import * as profilingV3Queries from "~/sql/profiling-v3"

export type ProfilingV3SessionSort = "asc" | "desc"

export type ProfilingV3SessionListItem = Awaited<ReturnType<typeof profilingV3Queries.selectProfilingSessionsV3ByUserIdStatement.execute>>[number]
export type ProfilingV3SessionDetail = Awaited<ReturnType<typeof profilingV3Queries.selectProfilingSessionV3ByIdStatement.execute>>[number]
export type ProfilingV3JobDescriptionTemplate = Awaited<ReturnType<typeof profilingV3Queries.selectJobDescriptionTemplatesV3ByUserIdStatement.execute>>[number]
export type ProfilingV3SessionResultSummary = Awaited<ReturnType<typeof profilingV3Queries.selectProfilingSessionV3ResultsByScoreDescStatement.execute>>[number]
export type ProfilingV3SessionResultDetail = Awaited<ReturnType<typeof profilingV3Queries.selectProfilingSessionV3ResultByIdStatement.execute>>[number]
export type ProfilingV3SessionFileRow = Awaited<ReturnType<typeof profilingV3Queries.selectProfilingSessionV3FilesStatement.execute>>[number]
export type ProfilingV3SessionFileView = Omit<ProfilingV3SessionFileRow, "size"> & { size: number }
