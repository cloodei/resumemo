import { screeningRepository } from "~/modules/screening/repository"

export type ProfilingV3SessionSort = "asc" | "desc"

export type ProfilingV3SessionListItem = Awaited<ReturnType<typeof screeningRepository.listSessions>>[number]
export type ProfilingV3SessionDetail = Awaited<ReturnType<typeof screeningRepository.getOwnedSession>>
export type ProfilingV3JobDescriptionTemplate = Awaited<ReturnType<typeof screeningRepository.listJobDescriptions>>[number]
export type ProfilingV3SessionResultSummary = Awaited<ReturnType<typeof screeningRepository.listSessionResults>>[number]
export type ProfilingV3SessionResultDetail = Awaited<ReturnType<typeof screeningRepository.getSessionResult>>
export type ProfilingV3SessionFileView = Awaited<ReturnType<typeof screeningRepository.listSessionFiles>>[number]
