# Question bank audit

Reproducible checks behind [docs/09-content/question-audit.md](../../../../docs/09-content/question-audit.md).

| Script | What it does |
|--------|--------------|
| `audit.py` | Mechanical checks over every question: duplicate stems, structural faults, answer-position distribution, the "longest option is the answer" tell, explanation coverage. |
| `audit_math.py` | Recomputes mathematics answers whose task is a pure arithmetic evaluation. A mismatch here is a provably wrong key. |

Both read the seed content only and change nothing. Run from `backend/`:

```bash
python3 prisma/scripts/audit/audit.py
python3 prisma/scripts/audit/audit_math.py
```

The reading pass — factual errors, ambiguity, weak distractors — cannot be
scripted; the report records what it covered.
