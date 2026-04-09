# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Project roles (Scrum vs Kanban)

Backend is authoritative; the UI reads `GET /api/projects/{id}/membership/me` (`myRole` on `currentProject`).

| Capability | OWNER | ADMIN | SCRUM_MASTER (Scrum only) | MEMBER |
|------------|:-----:|:-----:|:-------------------------:|:------:|
| Invite / change roles | Yes | Yes | No | No |
| Assign Scrum Master | Yes | Yes | No | No |
| Sprint create / edit / start / complete | Scrum: Yes | Scrum: Yes | Scrum: Yes | No |
| Sprint list: see INACTIVE sprints | Yes | Yes | Yes | No (ACTIVE+COMPLETED only) |
| Assign task to sprint: target INACTIVE | Yes | Yes | Yes | No (active sprint only) |
| Edit/delete any task | Yes | Yes | No (issue rules) | Creator / assignee rules |
