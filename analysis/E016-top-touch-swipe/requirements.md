# E016 Requirements

Owner-approved 2026-10-13: simulator-only top touch swipe observation. One Mission: real pointer → raw sensor channels → pinned SDK recognizer → MOD subscription → visible direction/count. Preserve E010 findings. No Robot Action, server, production contract, physical-device claim or new gesture.

AC1: three independent swipes in each direction, correct SDK position semantics.
AC2: one swipe per contact, no hold/reverse/release duplication.
AC3: two consecutive independent contacts accepted and separately recognized.
AC4: tap/sub-threshold motion produces no swipe; exact ±60 tested automatically.
AC5: cancellation/leave cleans input; recognized events retained; next contact recovers.
AC6: visible feedback matches MOD direction/count and operation.
AC7: real SDK→MOD path; no synthesized named swipe injection.
AC8: PASS/FAIL/not-run plus evidence type; automation does not replace human operation.

Human operation remains pending until the owner performs the documented procedure. Draft PR is authorized even while that evidence is pending. Latest owner instruction supersedes prior planning-workspace routing: create feature worktree first; all writes occur there, never in dev worktree. Owner explicitly authorizes topic commits, push, Draft PR and then human review; no merge.
