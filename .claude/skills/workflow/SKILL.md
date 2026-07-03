---
name: workflow
description: Orchestrate the full agentic development workflow (plan → tech stack → design → develop → security review → QA → deploy) for a feature or project. Use when the user invokes /workflow or asks to run the full pipeline on a request. Assesses scope first and lets the user pick autopilot or checkpoint mode.
---

# Development Workflow Orchestrator

You are orchestrating a multi-agent development pipeline. You run in the main session and delegate each phase to the specialized agents defined in `.claude/agents/` via the Agent tool. You are the coordinator: you carry context between phases, enforce quality gates, and decide when the user must be consulted.

The task is: $ARGUMENTS (if empty, ask the user what to build).

## Step 1 — Scope assessment and mode selection

Run the **planner** agent first (synchronously) on the task. The planner returns a plan including a scope classification: SMALL, MEDIUM, or LARGE.

Then use AskUserQuestion to let the user choose the execution mode, recommending based on scope:

- **Autopilot** (recommend for SMALL): run all phases automatically; the only mandatory pause is the production-deploy confirmation.
- **Checkpoint** (recommend for MEDIUM/LARGE): pause for user approval after the plan, after design (if any), and before deployment. The user sees each phase's output and can redirect before the next phase spends effort.
- Also confirm whether deployment is in scope at all for this run, and whether autopilot may deploy to production without a final confirmation (default: no — always confirm production).

Record the chosen mode and honor it for the rest of the run. Track phases with the task tools (TaskCreate/TaskUpdate) so the user can see pipeline progress.

## Step 2 — Phase pipeline

Run phases in order, skipping any that don't apply. Each agent call must include, in its prompt: the original task, the relevant outputs of prior phases (paste them — agents start with no context), and what you expect back.

| # | Phase | Agent | Run when | Gate |
|---|-------|-------|----------|------|
| 1 | Plan | `planner` | Always | Checkpoint mode: user approves plan |
| 2 | Tech stack | `tech-stack-advisor` | Plan flags new dependencies/services/greenfield choices | Checkpoint mode: user approves additions |
| 3 | Design | `designer` | Task has a user-facing UI surface | Checkpoint mode: user approves spec |
| 4 | Develop | `developer` | Always | Developer reports clean tests/build |
| 5 | Security review | `security-reviewer` | Always | **Hard gate**: PASS required in both modes |
| 6 | QA | `qa-engineer` | Always | **Hard gate**: PASS required in both modes |
| 7 | Deploy | `deployer` | User included deployment in scope | Production confirmation per Step 1 |

## Step 3 — Gate handling and loops

- **Security BLOCK or QA FAIL**: send the findings/bugs back to the `developer` agent to fix (use SendMessage to continue the same developer agent if it's still available, otherwise a fresh one with full context), then re-run the failed reviewer on the fixes only. Limit: 3 fix-and-re-review cycles; if still failing, stop and present the situation to the user.
- **Checkpoint rejections**: if the user rejects a phase output, capture their feedback and re-run that phase's agent with it. Do not proceed past an unapproved checkpoint.
- **Agent errors/blockers**: if an agent reports it is blocked on something only the user can provide (credentials, account choices), surface it immediately via AskUserQuestion rather than guessing.

## Step 4 — Final report

When the pipeline finishes (or stops), give the user a single consolidated summary: what was built, key decisions made per phase, security/QA verdicts, what shipped and where (URLs), commits pushed, and any follow-ups deferred out of scope.

## Rules

- Never skip the security or QA gates, even in autopilot.
- Phases run sequentially — later phases need earlier outputs. Do not parallelize the pipeline.
- Relay each phase's key findings to the user as the pipeline progresses (brief, one paragraph per phase in checkpoint mode; a short line in autopilot).
- Standalone use is always allowed: the user can also invoke any single agent directly without this skill.
