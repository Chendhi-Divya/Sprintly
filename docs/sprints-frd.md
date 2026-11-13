# Sprint Management — Functional Requirements Document

**Status:** Implemented (initial release)  
**Product:** Sprintly  
**Scope:** Project-level sprint planning and tracking

## 1. Purpose

A sprint is a time-boxed period in which a project team plans and completes a selected set of tasks toward a shared goal. Sprint management will let project members create and run sprints, move tasks between the backlog and a sprint, and review the outcome when the sprint ends.

## 2. Current baseline

Sprint functionality is implemented as a project-level Sprints view with a backlog, task movement, sprint lifecycle controls, and a Task Details assignment selector.

## 3. Users and permissions

- **Project members:** View project sprints and tasks; add or remove tasks from a sprint, subject to project permissions.
- **Project owner / organization administrators:** Create, edit, start, complete, and delete sprints.
- All sprint and task operations must be limited to projects the authenticated user can access.

## 4. Functional requirements

### FR-1: Sprint lifecycle

- Create a sprint with a required title, optional description, and start/end dates.
- Support `Planning`, `Active`, and `Completed` states.
- A project may have at most one active sprint at a time.
- Starting a sprint requires a valid date range; end date must be after start date.
- Completing a sprint records its completion time and requires an explicit backlog or next-planning-sprint destination for unfinished tasks. Past-due tasks are marked in the choice dialog.
- Only a non-active sprint can be deleted. Deleting a sprint requires explicitly moving its tasks to backlog or another non-completed sprint.

### FR-2: Backlog and sprint membership

- A task is either in the project backlog or assigned to one sprint in the same project. Sprint records store an array of task IDs, synchronized with each task's sprint reference.
- Users can add backlog tasks to a planning or active sprint and remove tasks back to the backlog.
- Sprint membership does not replace task status, priority, assignee, parent task, or due date.
- Prevent assigning a task to a sprint belonging to another project.

### FR-3: Sprint views

- Provide a project-level sprint view listing planning, active, and completed sprints.
- Show a sprint’s description, dates/duration, task count, status totals, and lifecycle timestamps.
- Show tasks grouped by workflow status and support existing task-detail navigation.
- Show backlog tasks not currently assigned to a sprint.

### FR-4: Task details integration

- Task Details shows the assigned sprint title, or “Backlog” when unassigned.
- Allow authorized project members to change sprint assignment using a project-scoped selector.
- Refresh the task and sprint views after assignment changes.

## 5. Data and API requirements

- Add a `Sprint` entity associated with a project. Fields include `title`, `description`, `tasks`, `startDate`, `endDate`, `status`, `createdBy`, `startedAt`, `completedAt`, and Mongoose `createdAt`/`updatedAt` timestamps.
- Add an optional `sprint` reference to tasks. A missing reference represents the backlog.
- Enforce sprint/project consistency and one active sprint per project in server-side validation; do not rely only on UI constraints.
- Provide authenticated, project-authorized endpoints to list/create/update/delete sprints, start/complete a sprint, and assign/unassign tasks.
- Deleting a sprint must not delete its tasks; require an explicit backlog or eligible sprint destination.

## 6. Acceptance criteria

1. An authorized user can create a planning sprint for a project with a name and valid dates.
2. A project cannot start a second active sprint while one is already active.
3. A task can be added to one sprint in its own project and moved back to the backlog.
4. Task status, assignee, priority, parent, and task details continue to work after sprint assignment.
5. Task Details displays the current sprint or Backlog and permits an authorized assignment change.
6. Completing a sprint preserves its history and leaves unfinished tasks available for the next sprint or backlog.
7. Users without access to the project cannot read or modify its sprints or sprint-task assignments.

## 7. Out of scope for initial release

Sprint velocity forecasting, burndown charts, automated capacity planning, recurring sprint generation, and cross-project sprints.
