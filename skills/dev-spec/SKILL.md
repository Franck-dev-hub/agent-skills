---
name: dev-spec
description: Use when asked to investigate a bug/feature request and turn it into a technical spec written outside Notion (the user handles Notion themselves) — "pose la spec", "fais-moi un rapport de spec", "spécifie ce ticket", "write the spec", "spec this out", "investigate and write a spec/report", a raw ticket description (Contexte/User story/AC, or Context/User story/AC) pasted with a request to fill it in, or "comment spécifier ça" / "how would you spec this".
---

# Dev spec (investigation → report)

Turns a functional ask (a raw ticket, a bug report, a one-line request, in French or in
English) into a technical spec report, through code investigation. Does **not** write to
Notion or any external tool; the user owns that. Output is a report handed back in the
conversation (or as a file if asked), in the exact section order below.

**The report itself is always written in French**, regardless of the language the
request came in.

## Method — "comment spécifier en tant que dev"

Before writing anything, run this loop **at least 3 times**, each pass sharpening the
one before it. Do not skip straight to a report after one pass: the first read of a
ticket is always the client's framing, not the technical shape of the fix.

1. **Comprendre la demande fonctionnelle**: not the wording, the actual gap. Read the
   ticket/request literally, then verify each factual claim in it against the code
   (`grep`, read the actual files). A claim in the ticket ("ça ne marche que sur X") is a
   hypothesis to check, not a given; it is frequently wrong or incomplete (e.g. a second
   working case the reporter didn't notice).
2. **Découper en grandes fonctionnalités**: split the ask into independently
   deliverable/testable units. Don't leave it as one lump; each unit should map to one
   or more ACs later.
3. **Visualiser le flux**: trace the actual runtime path (event, listener, render;
   request, controller, template; form submit, handler). Draw it in prose if needed.
   This is usually where the real root cause surfaces, not in the symptom.
4. **Lister les ingrédients**: name the concrete files/classes/components already
   involved (existing services, hooks, templates, config entries) versus what must be
   created. Point at exact paths, not areas.
5. **Anticiper les cas limites**: what happens with zero/multiple instances, already-done
   state, concurrent triggers, missing data. State them explicitly even if the answer is
   "non applicable ici".
6. **Lister les étapes en détail**: once the mechanism is understood, the technical
   solution should be nameable as concrete file-level changes, not vague intentions.
7. **Itérer**: after drafting 1 to 6 once, re-run the loop. Does step 3's flow contradict
   an assumption from step 1? Does step 4 reveal an existing pattern that changes the
   step 6 solution (e.g. a sibling case already solved the same way, reuse its
   mechanism instead of inventing a new one)? Stop iterating only when a fresh pass
   changes nothing.

Each iteration should be visible to the user as a short update if it overturns something
from the previous pass (e.g. "j'avais supposé X, le code montre Y"); don't silently
discard a wrong earlier read without saying so.

## Investigation

- Read the actual files, don't infer from names. Grep broadly first (French and English
  terms, ticket vocabulary and code vocabulary rarely match), then read full files, not
  excerpts, for anything that will be cited in the report.
- Prefer delegating pure-investigation legwork (multi-file grep, tracing a flow across
  a plugin) to a research agent/fork when it would otherwise fill context with output
  you won't need verbatim, but verify its concrete file/line claims yourself before
  citing them in the report, the same way any claim from the ticket gets verified.
- When the investigation surfaces an existing pattern solving an analogous case
  elsewhere in the code (a sibling hook, a similar guard), that pattern wins over a
  novel solution; name it explicitly in the report ("même mécanisme que X").

## Report format

French, no emojis, no em dashes, telegraphic where the original ticket trame is
telegraphic. Exactly these sections, in this order (this mirrors the ticket trame the
user pastes in, so the report can be copy-pasted straight into it):

```
## Contexte

<1-2 phrases : le comportement observé aujourd'hui, ce qui marche vs. ce qui ne marche
pas, en langage fonctionnel. Pas de chemin de fichier ni de ligne ici, pas de "pourquoi"
technique : ça va dans Détails / Notes>

## User story

En tant que …, je veux …, afin de …

## Critères d'acceptance

- [ ] <un critère = un comportement vérifiable isolément>
- [ ] <non-régression des cas qui marchaient déjà, si l'investigation en a trouvé>
- [ ] <cas limite identifié à l'étape 5, si applicable>

## Détails / Notes

- **Mécanisme actuel** : <flux réel, fichiers exacts>
- **Cause racine** : <ce qui bloque concrètement, pas le symptôme>
- **Solution proposée** : <fichiers à toucher, pattern existant réutilisé le cas échéant>
- **Points restant à trancher** : <ce que l'investigation n'a pas pu figer, à valider
  avant dev>

## Références

- Spécification Notion : <à remplir par l'utilisateur, ou lien si connu>
- Issue GitLab : <idem>

## Dépendances / tickets liés

- <si l'investigation en a révélé, sinon ligne omise>
```

Tag each claim with a confidence marker only where it is genuinely uncertain (a hook not
directly verified, a route not traced end to end); don't hedge things already confirmed
by reading the file.

### Contexte and AC stay condensed, not solution-shaped

The goal is to state **what** must work and **why**, not **how**. Keep this split strict:

- **Contexte**: the observed behaviour only, in plain functional language. The file/line
  evidence gathered during investigation is what makes the report trustworthy, but it
  belongs in "Détails / Notes", not in Contexte; don't let source citations bloat the
  section the dev reads first.
- **Critères d'acceptance**: a testable, observable outcome. A DOM-visible or
  user-visible identifier is fine when it *is* the acceptance check (e.g. "un seul panel
  `id="no-price"` par page" is something QA can literally inspect). What does **not**
  belong in an AC is which file, hook, or config entry to change, or a justification
  phrased as "après avoir fait X" — that names the fix, not the requirement. That
  reasoning goes in "Solution proposée".
- If in doubt whether a line is an AC or a solution note, ask: can this be verified by
  clicking around the site without reading the diff? If yes, it is an AC. If it only
  makes sense once you know which file changed, it belongs in Détails / Notes.

## Writing style

No em dashes (—) anywhere in the report, including inside the method commentary you
surface to the user while working this skill. Use a comma, a colon, a semicolon, or split
into two sentences instead.

## Traps

- **Writing the report from the ticket's own framing** without re-verifying its claims:
  the reported symptom is often narrower or wider than reality (see method step 1).
- **Stopping after one pass of the method**: the report before iteration usually
  proposes a locally-correct but architecturally inconsistent fix (duplicating a
  wiring entry per page instead of finding the shared hook meant for exactly this case).
- **Producing implementation code**: this skill's output is the spec report only; it
  does not touch application code, and does not write to Notion.
- **Padding "Détails / Notes" with narration of the investigation itself**: it holds the
  mechanism, cause, and proposed solution, not a log of what was searched.
- **Letting Contexte carry file/line citations or AC carry the fix**: both push the
  report from "what and why" toward "how", which is the opposite of the goal; the
  reasoning and file references live in Détails / Notes, not in the sections the dev
  reads as the requirement.
