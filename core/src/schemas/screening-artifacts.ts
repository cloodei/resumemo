import { z } from "zod"

const nullableString = z.string().nullable()

export const screeningSkillReferenceSchema = z.object({
	skill: z.string(),
	canonicalName: z.string(),
	taxonomyId: nullableString,
	path: z.array(z.string()),
})

export const screeningSoftSkillReferenceSchema = z.object({
	skill: z.string(),
	canonicalName: z.string(),
	taxonomyId: nullableString,
})

export const screeningResumeArtifactSchema = z.object({
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

export const screeningCandidateSkillSchema = screeningSkillReferenceSchema.extend({
	years: z.number().nonnegative(),
	zones: z.array(z.string()),
})

export const screeningJobDescriptionArtifactSchema = z.object({
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
			techSkills: z.array(screeningSkillReferenceSchema),
			certifications: z.array(screeningSkillReferenceSchema),
		}),
		niceToHave: z.object({
			fromJobDescription: z.array(screeningSkillReferenceSchema),
			fromTaxonomyExpansion: z.array(screeningSkillReferenceSchema),
		}),
	}),
	softSkills: z.array(screeningSoftSkillReferenceSchema),
})

export const screeningCandidateProfileSchema = z.object({
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
		directMention: z.array(screeningCandidateSkillSchema),
		certifications: z.array(screeningSkillReferenceSchema),
	}),
	softSkills: z.array(screeningSoftSkillReferenceSchema),
	education: z.object({
		major: nullableString,
		degree: nullableString,
	}),
	parseWarnings: z.array(z.string()),
})

export const screeningConstraintCheckSchema = z.object({
	required: nullableString,
	candidate: nullableString,
	passed: z.boolean(),
})

export const screeningScoreArtifactSchema = z.object({
	scores: z.object({
		hardSkillsScore: z.number(),
		hardConstraintsScore: z.number(),
		baseScore: z.number(),
		bonusScore: z.number(),
		totalScore: z.number(),
	}),
	breakdown: z.object({
		hardSkills: z.object({
			achieved: z.number(),
			possible: z.number(),
			ratio: z.number(),
			matchedMustHave: z.array(z.string()),
			matchedNiceToHave: z.array(z.string()),
			matchedExpansion: z.array(z.string()),
			missingMustHave: z.array(z.string()),
			missingNiceToHave: z.array(z.string()),
			missingExpansion: z.array(z.string()),
		}),
		hardConstraints: z.object({
			experience: screeningConstraintCheckSchema,
			degree: screeningConstraintCheckSchema,
		}),
		surplusSkills: z.array(z.string()),
		softSkills: z.object({
			matched: z.array(z.string()),
			missing: z.array(z.string()),
			score: z.number(),
		}),
		certifications: z.object({
			matched: z.array(z.string()),
			extra: z.array(z.string()),
			score: z.number(),
		}),
		spillover: z.object({
			hardSkillRatio: z.number(),
			bonusScore: z.number(),
		}),
	}),
	matchedSkills: z.array(z.string()),
	missingSkills: z.array(z.string()),
	extraSkills: z.array(z.string()),
})

export const screeningPipelineFileManifestSchema = z.object({
	file_id: z.number().int().positive(),
	storage_key: z.string().min(1),
	original_name: z.string().min(1),
})

export const screeningPipelineJobDescriptionSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1),
	raw_text: z.string().min(1),
	job_title: nullableString,
	source: z.enum(["inline", "template"]),
})

export const screeningPipelinePayloadSchema = z.object({
	session_id: z.string().uuid(),
	run_id: z.string().uuid(),
	job_description: screeningPipelineJobDescriptionSchema,
	files: z.array(screeningPipelineFileManifestSchema).min(1),
})

export const screeningPipelineResultSchema = z.object({
	file_id: z.number().int().positive(),
	candidate_name: nullableString,
	candidate_email: nullableString,
	candidate_phone: nullableString,
	raw_text: z.string(),
	resume_artifact: screeningResumeArtifactSchema.nullable(),
	candidate_profile: screeningCandidateProfileSchema,
	score_artifact: screeningScoreArtifactSchema,
	overall_score: z.number(),
	base_score: z.number(),
	bonus_score: z.number(),
	summary: z.string(),
	skills_matched: z.array(z.string()),
})

export const screeningPipelineCompletionSchema = z.object({
	type: z.literal("completion"),
	session_id: z.string().uuid(),
	run_id: z.string().uuid(),
	status: z.literal("completed"),
	job_description_artifact: screeningJobDescriptionArtifactSchema,
	results: z.array(screeningPipelineResultSchema),
})

export const screeningPipelineErrorSchema = z.object({
	type: z.literal("error"),
	session_id: z.string().uuid(),
	run_id: z.string().uuid(),
	status: z.literal("failed"),
	error: z.string(),
	job_description_artifact: screeningJobDescriptionArtifactSchema.nullable().optional(),
	partial_results: z.array(screeningPipelineResultSchema),
})

export const screeningPipelineCallbackSchema = z.union([
	screeningPipelineCompletionSchema,
	screeningPipelineErrorSchema,
])

export type ScreeningSkillReference = z.infer<typeof screeningSkillReferenceSchema>
export type ScreeningSoftSkillReference = z.infer<typeof screeningSoftSkillReferenceSchema>
export type ScreeningResumeArtifact = z.infer<typeof screeningResumeArtifactSchema>
export type ScreeningCandidateSkill = z.infer<typeof screeningCandidateSkillSchema>
export type ScreeningJobDescriptionArtifact = z.infer<typeof screeningJobDescriptionArtifactSchema>
export type ScreeningCandidateProfile = z.infer<typeof screeningCandidateProfileSchema>
export type ScreeningScoreArtifact = z.infer<typeof screeningScoreArtifactSchema>
export type ScreeningPipelinePayload = z.infer<typeof screeningPipelinePayloadSchema>
export type ScreeningPipelineResult = z.infer<typeof screeningPipelineResultSchema>
export type ScreeningPipelineCallback = z.infer<typeof screeningPipelineCallbackSchema>
