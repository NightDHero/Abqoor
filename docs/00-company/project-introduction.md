# Project Introduction

## Purpose

Provide a high-level introduction to Abqoor for anyone joining the project, including developers, designers, contributors, and stakeholders.

---

# What is Abqoor?

Abqoor is an adaptive online learning platform built specifically for students preparing for the Saudi Qudurat exam.

Its purpose is to improve student performance by delivering personalized study sessions that adapt to each learner's strengths and weaknesses.

Rather than giving every student the same sequence of questions, Abqoor continuously adjusts future study sessions based on previous performance.

---

# The Problem

Many existing preparation platforms present static question banks or random practice questions.

This often results in:

- Spending too much time on topics the student already understands.
- Spending too little time on weaker topics.
- Limited visibility into long-term progress.

Abqoor aims to solve these problems through adaptive learning.

---

# How It Works

At a high level:

1. The student signs in.
2. The student starts a study session.
3. Abqoor selects appropriate questions.
4. The student answers the questions.
5. The system evaluates performance.
6. Student mastery is updated.
7. Future sessions become more personalized.

This cycle repeats throughout the student's learning journey.

---

# Question System

Questions are image-based.

Each question consists of:

- One image containing the complete question and answer choices.
- Metadata stored in the database (such as the correct answer, subject, topic, and difficulty).

Question content is imported through administrative tools using PDF and Excel files.

---

# Project Principles

Abqoor follows several core principles:

- Learning outcomes come before engagement metrics.
- Keep the platform simple and focused.
- Build modular systems that can scale.
- Document important decisions before implementation.
- Treat the documentation in `/docs` as the project's source of truth.

---

# Current Status

The project is currently under active development.

Core infrastructure—including authentication, question management, media handling, and the question import pipeline—is being built before student-facing learning features.

---

# Long-Term Goal

Create the most effective adaptive Qudurat preparation platform in Saudi Arabia by combining high-quality educational content with intelligent, data-driven study sessions.