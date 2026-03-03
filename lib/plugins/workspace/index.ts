import type { TesserinPlugin } from "../types"
import kanbanPlugin from "./kanban"
import dailyNotesPlugin from "./daily-notes"
import timelinePlugin from "./timeline"
import samPlugin from "./sam"

export { kanbanPlugin, dailyNotesPlugin, timelinePlugin, samPlugin }

/** Optional workspace plugins — enabled/disabled by user in Settings → Plugins */
export const WORKSPACE_PLUGINS: TesserinPlugin[] = [
  kanbanPlugin,
  dailyNotesPlugin,
  timelinePlugin,
  samPlugin,
]
