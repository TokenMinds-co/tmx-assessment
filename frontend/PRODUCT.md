# Product

<!-- impeccable:product-schema 1 -->

Product context for design work, read by the `impeccable` skill. The full story is in the [root README](../README.md); decisions about each area live in [docs/](docs/).

## Platform

web

## Users

- **Primary: HR and recruiters** at TokenMinds, at a desk during the working day. They run the pipeline: vet applicants, move candidates between stages, send assessments and write screening-call reports. Confirmed by the user on 2026-09-15.
- **Secondary: hiring managers,** who drop in to review candidates and scores.
- **Candidates** never sign in. They open an invitation link and take the tests assigned to them.

## Product Purpose

TMX HR is TokenMinds' internal HR app. It brings recruitment into one place (today it is split across LinkedIn, a monday.com form and Calendly) and screens candidates with built-in assessments before they reach a trial day.

About 80% of candidates who reach a trial day turn out to be a poor fit, and each trial day costs the small team onboarding, meetings and supervision. Success means fewer failed trial days and one place that shows where every candidate stands.

## Positioning

An in-house replacement for TestGorilla, which was too expensive, built around the team's own recruitment stages instead of separate links.

## Operating Context

- Jobs are posted on LinkedIn. Applicants fill in a form (location, notice period, salary expectations), the team vets it, then books a screening call. Depending on the role, the candidate then gets an assessment, a trial day, or both.
- Recruitment stages, status categories and the person who owns each stage change over time.

## Capabilities and Constraints

- **First milestone:** five general tests (motivation, communication, attention to detail, critical thinking and English), 15–20 minutes each, multiple choice with a scoring model. The total per candidate should stay around 30–40 minutes. An LLM writes the questions from test specs.
- **Tests can be sent at any stage.**
- **Stages, statuses and stage owners are data,** never hardcoded.
- **Staff sign in with email and password.** No public sign-up. Confirmed by the user on 2026-09-15.
- **Undecided:** pass marks and who reviews scores; whether the app replaces monday.com and Calendly or syncs with them.

## Brand Commitments

- The product name is **TMX HR**.
- It uses the TMX brand from TMX Visibility (`tmx-visibility-lite`): the TMX wordmark and mark, the violet palette and sidebar gradient, and Inter. The user made this binding on 2026-09-15. Assets are in [public/brand/](public/brand/).

## Evidence on Hand

- There is no real candidate, job or score data yet. Anything shown before the API exists is sample data and must be labelled as sample data.

## Product Principles

1. The person moving candidates sees where each one stands at a glance.
2. Stages, statuses and owners come from data, so the pipeline can change without a code change.
3. Tests, results and the pipeline live in one place.
