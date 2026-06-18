export type NodeType =
  | 'origin'
  | 'spread'
  | 'media_relay'
  | 'official_response'
  | 'breakout'
  | 'cooldown'
  | 're_ferment'

export type RoleType =
  | 'tourist'
  | 'local_resident'
  | 'media'
  | 'influencer'
  | 'travel_agency'

export type SentimentType = 'positive' | 'neutral' | 'negative'

export type MaterialType =
  | 'typical_post'
  | 'spread_screenshot'
  | 'action_taken'
  | 'conclusion'

export interface Project {
  id: string
  name: string
  scenicSpot: string
  activityType: '黄金周' | '音乐节' | '灯会' | '庙会' | '其他'
  startDate: string
  endDate: string
  status: 'analyzing' | 'completed'
  heatIndex: number
  tags: string[]
}

export interface TimelineEvent {
  id: string
  projectId: string
  timestamp: string
  title: string
  content: string
  nodeType: NodeType
  sentiment: SentimentType
  spreadCount: number
  sourceType: string
  sourceAuthor: string
  role: RoleType
}

export interface OpinionItem {
  id: string
  projectId: string
  eventId: string
  role: RoleType
  content: string
  author: string
  platform: string
  sentiment: SentimentType
  confirmed: boolean
}

export interface ReportMaterial {
  id: string
  projectId: string
  type: MaterialType
  title: string
  content: string
  sourceEventId: string
  sortOrder: number
  selected: boolean
}

export const ROLE_LABELS: Record<RoleType, string> = {
  tourist: '游客',
  local_resident: '当地居民',
  media: '媒体',
  influencer: '自媒体达人',
  travel_agency: '旅行社',
}

export const NODE_TYPE_LABELS: Record<NodeType, string> = {
  origin: '首发',
  spread: '扩散',
  media_relay: '媒体转述',
  official_response: '官方回应',
  breakout: '爆点',
  cooldown: '降温点',
  re_ferment: '二次发酵点',
}

export const SENTIMENT_LABELS: Record<SentimentType, string> = {
  positive: '正面',
  neutral: '中性',
  negative: '负面',
}

export const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  typical_post: '典型帖子',
  spread_screenshot: '传播截图',
  action_taken: '处置动作',
  conclusion: '结论',
}
