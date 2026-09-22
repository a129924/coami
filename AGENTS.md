# Coami agent notes

- Read the current repository instructions and skills before changing code or creating commits. Later instructions may replace these notes.
- Before naming a branch, consult `.codex/skills/git-branch-naming/SKILL.md`. Before a commit, inspect the staged diff with `.codex/skills/git-commit-convention/SKILL.md` and wait for the owner's explicit confirmation of the proposed message.
- Keep this repository experimental. Record the question, procedure, evidence, and decision for each technical experiment.
- Put runnable POC code and its evidence under `experiments/<id>-<slug>/`. Move validated behavior into `server/src/` or `device/src/` only after an explicit decision.
- Keep device and server communication contract driven. Do not make device behavior depend on FastAPI or Python internals.
- Do not add production architecture or new capabilities ahead of experiment evidence.
- The first visible POC begins only after the owner explicitly requests phase two. Repository foundation work ends after the initial commit and push.
