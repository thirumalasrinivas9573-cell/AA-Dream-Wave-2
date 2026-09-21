# UI Component Foundation

Shared primitives live in `src/components/ui`.

## Available

| Component | Status                             |
| --------- | ---------------------------------- |
| Button    | Implemented (shadcn)               |
| Tooltip   | Implemented (shadcn)               |
| Skeleton  | Implemented in `components/common` |
| Spinner   | Implemented in `components/common` |

## Planned (Design System phase)

| Component | Notes                  |
| --------- | ---------------------- |
| Input     | Form control primitive |
| Card      | Surface container      |
| Dialog    | Modal primitive        |
| Badge     | Status / meta label    |
| Avatar    | User / entity image    |

Do not invent one-off styled duplicates. Prefer `npx shadcn@latest add <name>` and export from `components/ui/index.ts`.
