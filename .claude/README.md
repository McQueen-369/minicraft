# Agentic Development Workflow

A reusable set of Claude Code agents covering the full software lifecycle, plus an orchestrator skill that chains them. Everything is project-agnostic: agents discover the stack, commands, and conventions at runtime (from `CLAUDE.md`, manifests, and the code itself), so this `.claude/` directory can be copied into any repository.

## The agents (`.claude/agents/`)

| Agent | Phase | Writes code? | What it does |
|-------|-------|--------------|--------------|
| `planner` | Plan | No (read-only) | Turns a request into a scoped, step-by-step implementation plan with risks and a testing strategy |
| `tech-stack-advisor` | Tech stack | No (read-only) | Evaluates and recommends dependencies/services; defaults to the existing stack |
| `designer` | Design | Spec/mockups only | Produces concrete UI/UX specs matching the product's existing design language (uses Figma MCP when connected) |
| `developer` | Development | Yes | Implements the plan/spec in small verified steps, writes basic tests, commits |
| `security-reviewer` | Security review | No (read-only) | Audits the diff for exploitable vulnerabilities; severity-ranked findings; PASS/BLOCK verdict |
| `qa-engineer` | QA | Tests only | Runs suites, drives the real app (Playwright for web), attacks edge cases, adds regression tests; PASS/FAIL verdict |
| `deployer` | Deployment | No | Pre-flight checks, deploys via MCP (Vercel, Supabase migrations) or project tooling, verifies live, knows how to roll back |

## Two ways to use them

**1. Full pipeline** — run the orchestrator skill:

```
/workflow add a friends list with online status
```

It plans first, then asks you to choose a mode based on the plan's scope:

- **Autopilot** (small tasks): phases run automatically; you're only asked before anything ships to production.
- **Checkpoint** (medium/large tasks): you approve the plan, the design, and the deployment before each next phase runs.

Security review and QA are hard gates in both modes — failures loop back to the developer agent (up to 3 fix cycles) before anything deploys.

**2. À la carte** — invoke any agent directly for a single phase:

```
Use the planner agent to plan a trading system between players
Use the security-reviewer agent to audit the current branch
Use the qa-engineer agent to test the multiplayer chat end to end
```

## Pipeline order

```
plan → tech stack* → design* → develop → security review → QA → deploy*
                                              ↑______fix loop______↓
```

\* skipped when not applicable: tech stack only when new dependencies are in play, design only for UI work, deploy only when you asked for it.

## Reusing in another project

Copy `.claude/agents/` and `.claude/skills/workflow/` into the target repo. For best results give that repo a `CLAUDE.md` documenting its build/test/lint commands and conventions — every agent reads it first.
