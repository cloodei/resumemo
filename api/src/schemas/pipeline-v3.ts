import { t } from "elysia"

const nullableString = t.Nullable(t.String())

const jobDescriptionArtifactSchema = t.Object({
	metadata: t.Object({
		name: t.String(),
		jobTitle: nullableString,
		source: t.Union([t.Literal("inline"), t.Literal("template")]),
		processedAt: t.String(),
	}),
	hardConstraints: t.Object({
		minExperienceYears: t.Nullable(t.Number()),
		requiredDegree: nullableString,
	}),
	hardSkills: t.Object({
		mustHave: t.Object({
			techSkills: t.Array(t.String()),
			certifications: t.Array(t.String()),
		}),
		niceToHave: t.Object({
			fromJobDescription: t.Array(t.String()),
			fromTaxonomyExpansion: t.Array(t.String()),
		}),
	}),
	softSkills: t.Array(t.String()),
})

const resumeArtifactSchema = t.Nullable(t.Object({
	originalText: t.String(),
	normalizedText: t.String(),
	sections: t.Object({
			information: t.String(),
			summary: t.String(),
			skills: t.String(),
			experience: t.String(),
			education: t.String(),
		}),
}))

const candidateDnaSkillSchema = t.Object({
	skill: t.String(),
	taxonomyId: nullableString,
	years: t.Number(),
	zones: t.Array(t.String()),
})

const candidateDnaSchema = t.Object({
	information: t.Object({
		name: nullableString,
		phone: nullableString,
		email: nullableString,
		location: nullableString,
		linkedIn: nullableString,
		jobTitleOriginal: nullableString,
		jobTitleStandardized: nullableString,
		yearsOfExperience: t.Nullable(t.Number()),
	}),
	hardSkills: t.Object({
		directMention: t.Array(candidateDnaSkillSchema),
		certifications: t.Array(t.String()),
	}),
	softSkills: t.Array(t.Object({
		skill: t.String(),
		taxonomyId: nullableString,
	})),
	education: t.Object({
		major: nullableString,
		degree: nullableString,
	}),
	parseWarnings: t.Array(t.String()),
})

const scoreArtifactSchema = t.Object({
	scores: t.Object({
		baseScore: t.Number(),
		bonusScore: t.Number(),
		totalScore: t.Number(),
	}),
	breakdown: t.Record(t.String(), t.Any()),
	matchedSkills: t.Array(t.String()),
	missingSkills: t.Array(t.String()),
	extraSkills: t.Array(t.String()),
})

export const pipelineResultV3Schema = t.Object({
	file_id: t.Number(),
	candidate_name: nullableString,
	candidate_email: nullableString,
	candidate_phone: nullableString,
	raw_text: t.String(),
	resume_artifact: resumeArtifactSchema,
	candidate_dna: candidateDnaSchema,
	score_artifact: scoreArtifactSchema,
	overall_score: t.Number(),
	base_score: t.Number(),
	bonus_score: t.Number(),
	summary: t.String(),
	skills_matched: t.Array(t.String()),
})

export const pipelineCompletionV3BodySchema = t.Object({
	type: t.Literal("completion"),
	session_id: t.String(),
	run_id: t.String(),
	status: t.Literal("completed"),
	job_description_artifact: jobDescriptionArtifactSchema,
	results: t.Array(pipelineResultV3Schema),
})

export const pipelineErrorV3BodySchema = t.Object({
	type: t.Literal("error"),
	session_id: t.String(),
	run_id: t.String(),
	status: t.Literal("failed"),
	error: t.String(),
	job_description_artifact: t.Optional(t.Nullable(jobDescriptionArtifactSchema)),
	partial_results: t.Array(pipelineResultV3Schema),
})

export const pipelineV3CallbackBodySchema = t.Union([
	pipelineCompletionV3BodySchema,
	pipelineErrorV3BodySchema,
])

export type PipelineV3CallbackBody = typeof pipelineV3CallbackBodySchema.static
