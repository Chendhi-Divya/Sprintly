# Sprints — Codebase Implementation Guide

**Status:** Implementation plan  
**Related requirements:** [Sprint Management FRD](sprints-frd.md)  
**Current state:** Project-scoped sprint creation, lifecycle, task movement, and Task Details assignment are implemented.

## 1. Recommended first-release design

Sprints are project-scoped. Each task stores an optional sprint reference, and each Sprint record stores its task IDs:

- A task with no sprint reference is in the backlog.
- A task can belong to at most one sprint.
- Keep `Sprint.tasks` and `Task.sprint` synchronized so a task appears in only one sprint or the backlog.
- A sprint belongs to exactly one project; do not allow cross-project task membership.
- Keep sprint membership independent of status, priority, assignee, due date, and parent task.
- Permit only one `Active` sprint per project. Enforce this in server logic, not only in the UI.

Lifecycle: `Planning` → `Active` → `Completed`. A project has at most one active sprint. Completion requires an explicit destination (backlog or a planning sprint) for unfinished tasks; the UI marks past-due tasks. Deleting a non-active sprint requires an explicit destination for all its tasks. Active sprints must be completed before deletion.

## 2. Existing architecture to extend

### Server

- Task schema: [server/src/models/task.ts](../server/src/models/task.ts)
- Project schema: [server/src/models/project.ts](../server/src/models/project.ts)
- Task routes: [server/src/routes/taskRoutes.ts](../server/src/routes/taskRoutes.ts)
- Task controller: [server/src/controllers/taskController.ts](../server/src/controllers/taskController.ts)
- Project membership authorization: [server/src/middleware/projectAuthorization.ts](../server/src/middleware/projectAuthorization.ts)
- Server route registration: [server/src/server.ts](../server/src/server.ts)

### Client

- RTK Query task types/endpoints/cache tags: [client/src/services/taskApi.ts](../client/src/services/taskApi.ts)
- Project/view selection and filters: [client/src/components/ProjectHeader.tsx](../client/src/components/ProjectHeader.tsx)
- Board and List task rendering: [client/src/pages/TaskBoard.tsx](../client/src/pages/TaskBoard.tsx)
- Task detail and current Sprint placeholder: [client/src/components/TaskDetailsPanel.tsx](../client/src/components/TaskDetailsPanel.tsx)
- Dashboard state and detail-panel opening: [client/src/pages/Dashboard.tsx](../client/src/pages/Dashboard.tsx)
- Production/build scripts: `npm run build` in both `server/` and `client/`; client lint: `npm run lint`.

## 3. Implementation phases

### Phase 1 — Data model and integrity rules

1. Add `server/src/models/Sprint.ts` with fields such as:
   - `title` (required, trimmed)
   - `description` (optional text)
   - `project` (required ObjectId ref to Project, indexed)
   - `tasks` (Task ObjectId refs, default empty array)
   - `status` (`Planning`, `Active`, `Completed`)
   - `startDate`, `endDate` (optional while planning, validated when starting)
   - `createdBy` (User ref)
   - `startedAt`, `completedAt` (Date timestamps)
   - Mongoose `createdAt` and `updatedAt` timestamps
2. Add optional `sprint?: mongoose.Types.ObjectId` to the task interface and schema in `server/src/models/task.ts`, referencing `Sprint`. No sprint means backlog.
3. Add indexes for common access paths, especially `{ project: 1, status: 1 }` on sprints and `{ project: 1, sprint: 1 }` on tasks if project task queries use both filters.
4. Validate that a task and selected sprint belong to the same project. Validate on create, update, and bulk task move; never trust a client-supplied project/sprint pair.
5. Enforce one active sprint per project in a race-aware server operation. A MongoDB unique partial index can be considered, but verify compatibility with the deployed MongoDB version and Mongoose index behavior. At minimum serialize/guard the start operation and handle duplicate-key conflicts.

### Phase 2 — Server API and authorization

Prefer a dedicated router/controller rather than adding every lifecycle operation to `taskController.ts`:

- Add `server/src/controllers/sprintController.ts`.
- Add `server/src/routes/sprintRoutes.ts`.
- Register the router in `server/src/server.ts`, for example under `/api/projects/:projectId/sprints` (or mount under `/api/sprints` with `projectId` in query/body; choose one convention and use it consistently).
- Reuse the project membership rule in `projectAuthorization.ts`, or add a sprint-specific middleware that loads the sprint, resolves its project, and checks membership. Existing task middleware expects `req.params.id` to be a task ID, so do not attach `checkTaskProjectMember` directly to sprint routes.

Suggested endpoints:

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/projects/:projectId/sprints` | List project sprints and lightweight task counts/status totals |
| POST | `/api/projects/:projectId/sprints` | Create a planning sprint |
| PATCH | `/api/projects/:projectId/sprints/:sprintId` | Edit name, goal, and planning dates |
| POST | `/api/projects/:projectId/sprints/:sprintId/start` | Validate date range and activate the sprint |
| POST | `/api/projects/:projectId/sprints/:sprintId/complete` | Complete sprint and persist completion timestamp |
| DELETE | `/api/projects/:projectId/sprints/:sprintId` | Delete only under an explicit policy; never delete tasks implicitly |
| PATCH | `/api/projects/:projectId/sprints/:sprintId/tasks` | Assign/remove task IDs in a validated bulk operation, or use a task-specific endpoint |

For every endpoint: authenticate, validate Mongo IDs/body, load the project/sprint from the URL, enforce project membership, ensure the sprint belongs to the project, and return consistent status codes. For deletion, either reject when tasks remain or clear their sprint references transactionally/through a carefully handled bulk update.

### Phase 3 — Extend task APIs

1. Include optional sprint reference in task response types and populate it as `{ _id, name, status }` where useful.
2. Add `sprint?: string | null` to client `UpdateTaskRequest` and to server task update validation. A null/empty value moves the task to backlog.
3. Add RTK Query types and endpoints in `taskApi.ts` for sprint list/create/update/start/complete/delete and task membership updates.
4. Add appropriate cache tags (for example `Sprints`, with project/sprint IDs) and invalidate task/sprint caches after membership changes. Follow the existing `taskApi` tag pattern; avoid invalidating all project/task queries for a single task update if targeted tags suffice.
5. Preserve existing pagination behavior in task APIs. Do not assume one `getTasks` response always contains every project task; fetch/filter sprint task lists through a server endpoint when pagination could hide tasks.

### Phase 4 — Project sprint and backlog UI

1. Add a project-level Sprints/Backlog view, ideally in the existing project navigation/header flow in `ProjectHeader.tsx` and view composition in `Dashboard.tsx`/`TaskBoard.tsx`.
2. Build reusable sprint components, e.g. `SprintList`, `SprintForm`, and `SprintBoard`, under `client/src/components/` or a dedicated `client/src/features/sprints/` folder.
3. Show planning, active, and completed sprints; include name, goal, dates, task totals, and status totals.
4. Provide a backlog view and controls to move tasks into a planning/active sprint and back to backlog. Validate and display API errors in the same style used elsewhere in the dashboard.
5. Reuse task detail opening through `onTaskOpen` or the existing `sprintly:open-task` event so task details behave consistently from both board and sprint views.

### Phase 5 — Task Details integration

In `TaskDetailsPanel.tsx`, replace “Sprint functionality not configured yet” with:

- the assigned sprint name/status, or a Backlog label;
- a project-scoped sprint selector containing planning and active sprints (plus Backlog);
- a save/update action wired to the task sprint mutation;
- a loading/error/empty state.

Use the already-derived project ID for the selector query. Changing sprint membership must not change task status or other fields. Refresh/invalidate the task and sprint queries after success.

## 4. Validation and tests

### Server checks

- Create/list/update/start/complete sprint happy paths.
- Reject invalid dates and end dates not later than start dates.
- Reject a second active sprint for the same project; allow active sprints in different projects.
- Reject sprint/task project mismatch and unauthorized project access.
- Assign, unassign, and move multiple tasks; confirm task fields unrelated to sprint are preserved.
- Delete behavior with sprint tasks follows the documented policy and never deletes task documents.
- Build with `cd server && npm run build`.

### Client checks

- Project switch changes the sprint list and backlog data.
- Empty project, no sprints, loading, and API error states are usable.
- Task can be moved into a sprint and back to backlog; task details and board agree after refresh.
- Completed sprint remains readable but cannot accept new tasks unless product policy explicitly allows it.
- Keyboard and narrow-screen interaction for sprint controls.
- Build with `cd client && npm run build`; run `npm run lint` from `client/`.

## 5. Suggested delivery order

1. Finalize lifecycle and completed-sprint task policy.
2. Add Sprint schema and task reference.
3. Implement and verify authorized APIs/invariants.
4. Extend task API types, mutations, queries, and cache invalidation.
5. Build project sprint/backlog view.
6. Replace Task Details placeholder with sprint assignment.
7. Run server/client builds, lint, and manual multi-project/permission checks.

This order establishes project and data integrity before the UI depends on sprint behavior.
