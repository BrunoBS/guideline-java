#!/usr/bin/env python3
"""Static, fail-closed structural audit. Not a semantic correctness certificate."""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
EXPECTED = (
    "java-25-best-practices", "solid-clean-code", "design-patterns",
    "spring-boot-4", "resilience-patterns", "jvm-performance",
    "database-performance", "testing-quality", "architecture-review",
    "api-scalability", "java-concurrency", "observability-sre",
    "distributed-systems", "cache-engineering", "api-security",
    "load-capacity-testing", "sql-query-optimization",
)
errors = []
for name in EXPECTED:
    skill = ROOT / name / "SKILL.md"
    example = ROOT / name / "references" / "EXEMPLOS-E-DECISOES.md"
    if not skill.is_file():
        errors.append(f"{name}: missing SKILL.md")
        continue
    body = skill.read_text(encoding="utf-8")
    if not re.search(r"\A---\s*\nname:\s*" + re.escape(name) + r"\s*\n", body):
        errors.append(f"{name}: missing or mismatched frontmatter name")
    if not re.search(r"(?m)^description:\s*\S", body):
        errors.append(f"{name}: missing description")
    if "CONTRATO-EXECUCAO-AGENTES.md" not in body:
        errors.append(f"{name}: missing execution contract link")
    if "EXEMPLOS-E-DECISOES.md" not in body:
        errors.append(f"{name}: missing examples link")
    if not example.is_file():
        errors.append(f"{name}: missing example file")
    elif len(example.read_text(encoding="utf-8").strip()) < 250:
        errors.append(f"{name}: example file too short to audit")
for name in EXPECTED:
    example = ROOT / name / "references" / "EXEMPLOS-E-DECISOES.md"
    if example.is_file():
        body = example.read_text(encoding="utf-8")
        for heading in ("### Quando NÃO aplicar", "### Critério de verificação", "### Referência"):
            if heading not in body:
                errors.append(f"{name}: missing example heading: {heading}")
        if "não código compilado" not in body:
            errors.append(f"{name}: missing didactic disclaimer")
if not (ROOT / "CONTRATO-EXECUCAO-AGENTES.md").is_file():
    errors.append("missing shared execution contract")
for issue in errors:
    print("FAIL:", issue)
print(f"Audited {len(EXPECTED)} skills; structural issues: {len(errors)}")
if errors:
    sys.exit(1)
print("PASS: structural checks only; semantic and A/B validation still required")
