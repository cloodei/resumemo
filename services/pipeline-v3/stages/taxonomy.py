"""Research-backed taxonomy helpers for the screening pipeline."""

from __future__ import annotations

from dataclasses import dataclass
import json
from functools import lru_cache
from pathlib import Path
import re


REPO_ROOT = Path(__file__).resolve().parents[3]
TECH_ONTOLOGY_PATH = REPO_ROOT / "research" / "data" / "taxonomy" / "taxonomy_processed" / "tech_ontology.json"


SOFT_SKILL_LIBRARY = {
	"communication": ["communication", "communicator", "verbal communication", "written communication", "presentation"],
	"teamwork": ["teamwork", "team player", "collaboration", "collaborative", "cross functional"],
	"leadership": ["leadership", "mentor", "coaching", "people management", "lead teams"],
	"stakeholder management": ["stakeholder management", "stakeholder engagement", "stakeholder communication"],
	"problem solving": ["problem solving", "problem-solver", "analytical thinking", "critical thinking"],
	"adaptability": ["adaptability", "adaptable", "flexible", "fast-paced", "self starter", "self-starter"],
}


def normalize_key(value: str) -> str:
	return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def contains_phrase(text: str, phrase: str) -> bool:
	pattern = r"(?<![a-z0-9])" + re.escape(phrase.lower()) + r"(?![a-z0-9])"
	return re.search(pattern, text.lower()) is not None


def taxonomy_id_for(path: list[str], term: str) -> str:
	path_key = ".".join(path)
	term_key = normalize_key(term).replace(" ", "_")
	return f"{path_key}_{term_key}" if path_key else term_key


@dataclass(frozen=True)
class SkillRef:
	skill: str
	canonical_name: str
	taxonomy_id: str | None
	path: tuple[str, ...]
	normalized: str
	kind: str

	def as_dict(self) -> dict:
		return {
			"skill": self.skill,
			"canonicalName": self.canonical_name,
			"taxonomyId": self.taxonomy_id,
			"path": list(self.path),
		}


def _walk_tech(node, path: list[str], leaf_entries: list[tuple[tuple[str, ...], list[SkillRef]]]) -> list[SkillRef]:
	entries: list[SkillRef] = []

	if isinstance(node, dict):
		for key, value in node.items():
			entries.extend(_walk_tech(value, [*path, key], leaf_entries))
		return entries

	if not isinstance(node, list):
		return entries

	leaf_refs: list[SkillRef] = []
	kind = "certification" if path and path[0] == "Certifications_and_Standards" else "tech"
	for term in node:
		ref = SkillRef(
			skill=term,
			canonical_name=term,
			taxonomy_id=taxonomy_id_for(path, term),
			path=tuple(path),
			normalized=normalize_key(term),
			kind=kind,
		)
		entries.append(ref)
		leaf_refs.append(ref)

	leaf_entries.append((tuple(path), leaf_refs))
	return entries


@lru_cache(maxsize=1)
def load_tech_taxonomy() -> tuple[list[SkillRef], dict[tuple[str, ...], list[SkillRef]]]:
	if not TECH_ONTOLOGY_PATH.exists():
		return [], {}

	with open(TECH_ONTOLOGY_PATH, encoding="utf-8") as file:
		raw = json.load(file)

	leaf_entries: list[tuple[tuple[str, ...], list[SkillRef]]] = []
	entries = _walk_tech(raw, [], leaf_entries)
	leaf_map = {path: refs for path, refs in leaf_entries}
	return entries, leaf_map


@lru_cache(maxsize=1)
def load_soft_skill_refs() -> list[SkillRef]:
	refs: list[SkillRef] = []
	for canonical_name in SOFT_SKILL_LIBRARY:
		refs.append(
			SkillRef(
				skill=canonical_name.title(),
				canonical_name=canonical_name,
				taxonomy_id=f"Soft_Skills.{canonical_name.replace(' ', '_')}",
				path=("Soft_Skills", canonical_name.replace(" ", "_")),
				normalized=canonical_name,
				kind="soft",
			)
		)
	return refs


def dedupe_refs(refs: list[SkillRef]) -> list[SkillRef]:
	seen: set[tuple[str | None, str]] = set()
	items: list[SkillRef] = []
	for ref in refs:
		key = (ref.taxonomy_id, ref.normalized)
		if key in seen:
			continue
		seen.add(key)
		items.append(ref)
	return items


def find_tech_references(text: str) -> list[SkillRef]:
	entries, _ = load_tech_taxonomy()
	return dedupe_refs([
		entry
		for entry in sorted(entries, key=lambda item: len(item.skill), reverse=True)
		if entry.kind == "tech" and contains_phrase(text, entry.skill)
	])


def find_certification_references(text: str) -> list[SkillRef]:
	entries, _ = load_tech_taxonomy()
	return dedupe_refs([
		entry
		for entry in sorted(entries, key=lambda item: len(item.skill), reverse=True)
		if entry.kind == "certification" and contains_phrase(text, entry.skill)
	])


def expand_related_skills(refs: list[SkillRef], exclude: list[SkillRef] | None = None, limit: int = 10) -> list[SkillRef]:
	_, leaf_map = load_tech_taxonomy()
	excluded = {
		(ref.taxonomy_id, ref.normalized)
		for ref in (exclude or [])
	}
	items: list[SkillRef] = []
	for ref in refs:
		for sibling in leaf_map.get(ref.path, []):
			key = (sibling.taxonomy_id, sibling.normalized)
			if key in excluded or key == (ref.taxonomy_id, ref.normalized):
				continue
			excluded.add(key)
			items.append(sibling)
			if len(items) >= limit:
				return items
	return items


def find_soft_skill_references(text: str) -> list[SkillRef]:
	lowered = text.lower()
	results: list[SkillRef] = []
	for ref in load_soft_skill_refs():
		aliases = SOFT_SKILL_LIBRARY.get(ref.canonical_name, [])
		if any(alias in lowered for alias in aliases):
			results.append(ref)
	return dedupe_refs(results)


def make_unmapped_skill(skill: str) -> dict:
	return {
		"skill": skill,
		"canonicalName": skill,
		"taxonomyId": None,
		"path": [],
	}
