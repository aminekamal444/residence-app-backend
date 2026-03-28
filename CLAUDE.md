\# S.G.I.R. - Residence Management System (Backend)



\## Stack

\- Node.js + Express

\- MongoDB + Mongoose

\- JWT authentication (bcrypt for passwords)



\## Project Structure

\- /src/routes/ — Express route files (reports, tasks, users, votes)

\- /src/services/ — Business logic (alert, audit, auth, budget, notification, photo, report, task, user)

\- /src/utils/ — Helper utilities

\- server.js — Main entry point, all routes mounted here



\## Critical Rules

\- Passwords are hashed ONCE via bcrypt pre-save hook. NEVER double-hash.

\- Every route file in /src/routes/ MUST be mounted in server.js

\- Every service file MUST have complete exports — check for truncated module.exports

\- Mongoose: use instance methods (not static) for user-specific operations

\- Budget model: verify .save() and method calls match Mongoose API

\- Always check for port conflicts before starting the server



\## Commands

\- `npm run dev` — Start dev server

\- `npm test` — Run tests (run after every fix)



\## Workflow

\- Read a file fully before modifying it

\- Explain the root cause of every bug before fixing

\- Run tests after each fix to confirm

\- Never auto-commit without asking

```



\*\*Step 2 — Your first prompt\*\*



Now in that Claude Code panel on the right (where it says "Ask Claude to edit..."), paste this:

```

Read every file in this project — server.js, all routes, all services, all models, and utils. Audit the entire codebase for:



1\. Missing route mounts in server.js

2\. Truncated or incomplete exports in any service file

3\. Double password hashing (bcrypt called twice)

4\. Mongoose method errors (static vs instance, wrong method names)

5\. Any controller referencing a function that doesn't exist in its service

6\. Port conflict issues

7\. Missing middleware or broken auth flows



List ALL issues you find BEFORE fixing anything. Then fix them one by one, explaining each fix. After all fixes, run npm test.

```



This single prompt will catch every type of bug you've been dealing with. Claude Code will read all the files, cross-reference them, and give you a full audit.



\*\*Step 3 — After the audit, set up your global preferences\*\*



In PowerShell:

```

notepad %USERPROFILE%\\.claude\\CLAUDE.md

