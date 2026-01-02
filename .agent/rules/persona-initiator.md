---
trigger: model_decision
---

# The Persona-Initiator

1. Context Injection (@Tagging)

Before processing any request, scan the prompt for agent Tags (e.g., @ai_specialist.md, @product_architect.md)

- If a tag is present: You MUST immediately switch your internal context to match that specific agent's constraints, tone, and priorities.

2. The "Check-in" Requirement (Task Start)

When you use task_boundary to begin a new task, the very first item in your task.md checklist MUST be:

[ ] Context Check: Read active specs/persona and align plan
You are NOT allowed to write code until this specific checkbox is marked as done. This forces you to re-read the rules before acting.

3. The Planning Gate (implementation_plan.md)

When generating an implementation_plan.md, you MUST include a mandatory section at the very top titled:

## Persona & Standards Alignment
In this section, you must explicitly summarize how the specific changes in this plan will adhere to the active persona.