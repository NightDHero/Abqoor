# Project Context

## Project

Abqoor

## Type

Adaptive Qudurat exam preparation platform for Saudi Arabia.

## Goal

Improve student Qudurat exam performance by dynamically selecting questions based on mastery level and tracking progress over time.

## Core Product Loop

- Student starts a study session.
- System selects questions based on mastery profile.
- Student answers questions.
- System evaluates answers instantly.
- System updates mastery per topic.
- System adjusts future question selection.
- Session ends with performance summary.

## Data Model Expectation

Each question must have:

- topic
- subtopic
- difficulty, from 1 to 10
- correct answer

System must track:

- per-topic accuracy
- response history
- improvement over time

## MVP Features

### Authentication

- Email and password login.
- Basic session handling.

### Question System

- Fetch questions by topic and difficulty.
- Store answers and correctness.

### Study Sessions

- 10 to 20 questions per session.
- Adaptive selection based on performance.
- Session summary at end.

### Progress Tracking

- Accuracy per topic.
- Weak vs strong topics.
- Improvement tracking over time.

## Adaptive Logic Rules

- If topic accuracy is less than 60%, use easier questions.
- If topic accuracy is greater than 80%, use harder questions.
- New users receive a balanced topic mix.
- Weak users receive focused practice.
- Strong users receive diversified topics.

## Non-Goals

- No chatbot.
- No social features.
- No leaderboard.
- No gamification yet.
- No complex ML models.

## System Principles

- Keep architecture modular.
- Keep logic rule-based in the MVP.
- Optimize for learning outcomes.
- Every feature must serve the core learning loop.

## Success Metric

Student consistently improves toward a target Qudurat exam score.

