# Pipeline Evaluation Harness

These tests provide a lightweight regression harness for the current NLP pipeline.

- `test_parse.py`: identity extraction and experience parsing sanity checks
- `test_score.py`: hybrid ranking behavior and weight redistribution checks
- `test_semantic_backend.py`: semantic backend reporting and sentence-transformer fallback coverage

Run with:

```bash
pytest services/pipeline/tests
```
