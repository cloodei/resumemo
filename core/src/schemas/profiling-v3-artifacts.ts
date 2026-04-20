import { z } from "zod"

const nullableString = z.string().nullable()

export const profilingV3JobDescriptionArtifactSchema = z.object({
	metadata: z.object({
		name: z.string(),
		jobTitle: nullableString,
		source: z.enum(["inline", "template"]),
		processedAt: z.string().datetime(),
	}),
	hardConstraints: z.object({
		minExperienceYears: z.number().nullable(),
		requiredDegree: nullableString,
	}),
	hardSkills: z.object({
		mustHave: z.object({
			techSkills: z.array(z.string()),
			certifications: z.array(z.string()),
		}),
		niceToHave: z.object({
			fromJobDescription: z.array(z.string()),
			fromTaxonomyExpansion: z.array(z.string()),
		}),
	}),
	softSkills: z.array(z.string()),
})

export const profilingV3ResumeArtifactSchema = z.object({
	originalText: z.string(),
	normalizedText: z.string(),
	sections: z.object({
		information: z.string(),
		summary: z.string(),
		skills: z.string(),
		experience: z.string(),
		education: z.string(),
	}),
})

export const profilingV3CandidateDnaSkillSchema = z.object({
	skill: z.string(),
	taxonomyId: nullableString,
	years: z.number().nonnegative(),
	zones: z.array(z.string()),
})

export const profilingV3CandidateDnaSchema = z.object({
	information: z.object({
		name: nullableString,
		phone: nullableString,
		email: nullableString,
		location: nullableString,
		linkedIn: nullableString,
		jobTitleOriginal: nullableString,
		jobTitleStandardized: nullableString,
		yearsOfExperience: z.number().nullable(),
	}),
	hardSkills: z.object({
		directMention: z.array(profilingV3CandidateDnaSkillSchema),
		certifications: z.array(z.string()),
	}),
	softSkills: z.array(z.object({
		skill: z.string(),
		taxonomyId: nullableString,
	})),
	education: z.object({
		major: nullableString,
		degree: nullableString,
	}),
	parseWarnings: z.array(z.string()),
})

export const profilingV3ScoreArtifactSchema = z.object({
	scores: z.object({
		baseScore: z.number(),
		bonusScore: z.number(),
		totalScore: z.number(),
	}),
	breakdown: z.record(z.string(), z.unknown()),
	matchedSkills: z.array(z.string()),
	missingSkills: z.array(z.string()),
	extraSkills: z.array(z.string()),
})

export const profilingV3PipelineFileManifestSchema = z.object({
	file_id: z.number().int().positive(),
	storage_key: z.string().min(1),
	original_name: z.string().min(1),
})

export const profilingV3PipelineJobDescriptionSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1),
	raw_text: z.string().min(1),
	job_title: nullableString,
	source: z.enum(["inline", "template"]),
})

export const profilingV3PipelineJobPayloadSchema = z.object({
	session_id: z.string().uuid(),
	run_id: z.string().uuid(),
	job_description: profilingV3PipelineJobDescriptionSchema,
	files: z.array(profilingV3PipelineFileManifestSchema).min(1),
})

export const profilingV3PipelineResultSchema = z.object({
	file_id: z.number().int().positive(),
	candidate_name: nullableString,
	candidate_email: nullableString,
	candidate_phone: nullableString,
	raw_text: z.string(),
	resume_artifact: profilingV3ResumeArtifactSchema.nullable(),
	candidate_dna: profilingV3CandidateDnaSchema,
	score_artifact: profilingV3ScoreArtifactSchema,
	overall_score: z.number(),
	base_score: z.number(),
	bonus_score: z.number(),
	summary: z.string(),
	skills_matched: z.array(z.string()),
})

export const profilingV3PipelineCompletionSchema = z.object({
	type: z.literal("completion"),
	session_id: z.string().uuid(),
	run_id: z.string().uuid(),
	status: z.literal("completed"),
	job_description_artifact: profilingV3JobDescriptionArtifactSchema,
	results: z.array(profilingV3PipelineResultSchema),
})

export const profilingV3PipelineErrorSchema = z.object({
	type: z.literal("error"),
	session_id: z.string().uuid(),
	run_id: z.string().uuid(),
	status: z.literal("failed"),
	error: z.string(),
	job_description_artifact: profilingV3JobDescriptionArtifactSchema.nullable().optional(),
	partial_results: z.array(profilingV3PipelineResultSchema),
})

export const profilingV3PipelineCallbackSchema = z.union([
	profilingV3PipelineCompletionSchema,
	profilingV3PipelineErrorSchema,
])

export type ProfilingV3JobDescriptionArtifact = z.infer<typeof profilingV3JobDescriptionArtifactSchema>
export type ProfilingV3ResumeArtifact = z.infer<typeof profilingV3ResumeArtifactSchema>
export type ProfilingV3CandidateDna = z.infer<typeof profilingV3CandidateDnaSchema>
export type ProfilingV3ScoreArtifact = z.infer<typeof profilingV3ScoreArtifactSchema>
export type ProfilingV3PipelineJobPayload = z.infer<typeof profilingV3PipelineJobPayloadSchema>
export type ProfilingV3PipelineResult = z.infer<typeof profilingV3PipelineResultSchema>
export type ProfilingV3PipelineCallback = z.infer<typeof profilingV3PipelineCallbackSchema>
