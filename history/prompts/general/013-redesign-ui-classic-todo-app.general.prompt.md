---
id: "013"
title: "Redesign UI Classic Todo App"
stage: general
date: "2026-02-16"
surface: agent
model: claude-sonnet-4-5-20250929
feature: none
branch: main
user: PMLS
command: chat
labels: ["ui", "frontend", "redesign", "todo-app"]
links:
  spec: "null"
  ticket: "null"
  adr: "null"
  pr: "null"
files:
  - frontend/app/page.tsx
  - frontend/app/layout.tsx
  - frontend/components/TodoList.tsx
  - frontend/components/AuthForm.tsx
tests: []
---

## Prompt

in phase 5 the ui is totaly differnt it is showing the ui of chatboot oh phscial ai book

## Response

Redesigned the frontend UI from a chatbot-style layout to a classic todo app:

1. **`page.tsx`**: Replaced gradient background + "AI Todo Chatbot" header with a clean white navbar titled "Todo App". Removed `ChatInterface` from the Tasks tab (now Tasks tab shows only `TodoList` full-width). Replaced the wide tab bar with a compact pill-style tab switcher. AI Chat remains available in its own tab.

2. **`TodoList.tsx`**: Added an inline "Add Task" form toggled by a "+ Add Task" button. Form includes title, description, priority (select), and due date fields. Submits via `taskApi.createTask()` and refreshes the list.

3. **`AuthForm.tsx`**: Changed title from "AI Todo Chatbot" to "Todo App". Updated footer tagline.

4. **`layout.tsx`**: Updated metadata title to "Todo App".

## Outcome

- Tasks tab now shows a clean todo list with an inline add-task form — no chat panel visible by default
- AI Chat is still accessible via the "AI Chat" tab
- App title and branding updated throughout
