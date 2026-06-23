import { createContext } from 'react'

// Broadcasts a global expand/collapse-all action to every AgentCard.
// `version` bumps on each click; `expanded` is the target state (or null = no-op).
export const ExpandAllContext = createContext({ version: 0, expanded: null })
