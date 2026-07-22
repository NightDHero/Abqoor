# Adaptive Learning

## Purpose

Document how adaptive learning should work in Abqoor.

## Philosophy

Adaptive learning exists to maximize learning efficiency by selecting questions that best match the student's current level of mastery.

The system is intentionally rule-based during the MVP and does not rely on machine learning.

---

## Learning Goals

The adaptive engine should:

- Identify weak topics.
- Reinforce weak concepts.
- Gradually increase challenge as mastery improves.
- Prevent unnecessary repetition.
- Encourage balanced coverage of the exam syllabus.

---

## Approved Rules

### New Student

- Present a balanced selection of topics.
- Use mostly easier and medium-difficulty questions.

### Weak Topic

If mastery is low:

- Prioritize that topic.
- Present easier questions first.
- Gradually increase difficulty after improvement.

### Strong Topic

If mastery is high:

- Reduce repetition.
- Increase question difficulty gradually.
- Maintain occasional review questions.

---

## Progress Updates

After every study session:

- Update mastery estimates.
- Update topic performance.
- Store historical progress.

Future study sessions should use this information when selecting questions.

---

## Future Expansion

Possible future improvements include:

- Spaced repetition
- Forgetting curve modeling
- Confidence tracking
- Personalized study plans

These are outside the MVP.