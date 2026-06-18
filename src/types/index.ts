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

export type ReportTemplateType = 'internal' | 'rectification' | 'event'

export type ImportTargetType = 'event' | 'opinion' | 'material' | 'ignore'

export interface OpinionFilterState {
  sentiment: SentimentType | 'all'
  platform: string
  confirmed: 'all' | 'confirmed' | 'unconfirmed'
}

export interface ImportFieldPreview {
  sourceKey: string
  sampleValue: string
  suggestedTarget: ImportTargetType
  matchedField: string | null
  userTarget: ImportTargetType
  userField: string | null
}

export interface ImportPreviewData {
  rawProject: any
  rawEvents: any[]
  rawOpinions: any[]
  rawMaterials: any[]
  fieldMappings: ImportFieldPreview[]
}

export interface ImportSummary {
  events: number
  opinions: number
  materials: number
}

export interface OpinionInsight {
  role: RoleType
  demands: string[]
  risks: string[]
  suggestions: string[]
}

export interface InsertedInsight {
  role: RoleType
  demands: string[]
  risks: string[]
  suggestions: string[]
}

export interface ReportTemplateSection {
  id: string
  title: string
  order: number
  materialTypes: MaterialType[]
  autoContent?: 'summary' | 'evolution' | 'stakeholder' | 'actions' | 'recommendations'
}

export interface ReportDraft {
  id: string
  projectId: string
  template: ReportTemplateType
  generatedAt: string
  outlineText: string
  materialIds: string[]
  versionNumber: number
  manualAnalysis: string
  insertedInsightsSection: string
}

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

export const REPORT_TEMPLATE_LABELS: Record<ReportTemplateType, string> = {
  internal: '集团内参',
  rectification: '景区整改复盘',
  event: '活动复盘',
}

export const IMPORT_TARGET_LABELS: Record<ImportTargetType, string> = {
  event: '时间线节点',
  opinion: '观点条目',
  material: '复盘素材',
  ignore: '忽略',
}

export const REPORT_TEMPLATES: Record<ReportTemplateType, ReportTemplateSection[]> = {
  internal: [
    { id: 's1', title: '事件概述', order: 1, materialTypes: [], autoContent: 'summary' },
    { id: 's2', title: '舆情演化分析', order: 2, materialTypes: ['typical_post', 'spread_screenshot'], autoContent: 'evolution' },
    { id: 's3', title: '涉事方与影响评估', order: 3, materialTypes: [], autoContent: 'stakeholder' },
    { id: 's4', title: '处置动作评估', order: 4, materialTypes: ['action_taken'] },
    { id: 's5', title: '管理建议', order: 5, materialTypes: ['conclusion'], autoContent: 'recommendations' },
  ],
  rectification: [
    { id: 's1', title: '景区概况与问题清单', order: 1, materialTypes: [], autoContent: 'summary' },
    { id: 's2', title: '问题溯源与典型案例', order: 2, materialTypes: ['typical_post'] },
    { id: 's3', title: '传播扩散路径', order: 3, materialTypes: ['spread_screenshot'], autoContent: 'evolution' },
    { id: 's4', title: '已采取整改措施', order: 4, materialTypes: ['action_taken'] },
    { id: 's5', title: '下一步整改计划', order: 5, materialTypes: ['conclusion'], autoContent: 'recommendations' },
    { id: 's6', title: '责任落实', order: 6, materialTypes: [] },
  ],
  event: [
    { id: 's1', title: '活动基本情况', order: 1, materialTypes: [], autoContent: 'summary' },
    { id: 's2', title: '活动亮点与评价', order: 2, materialTypes: ['typical_post', 'spread_screenshot'] },
    { id: 's3', title: '舆情重点节点回放', order: 3, materialTypes: ['typical_post'], autoContent: 'evolution' },
    { id: 's4', title: '各方反馈与诉求', order: 4, materialTypes: [], autoContent: 'stakeholder' },
    { id: 's5', title: '应急处置复盘', order: 5, materialTypes: ['action_taken'] },
    { id: 's6', title: '活动总结与改进建议', order: 6, materialTypes: ['conclusion'], autoContent: 'recommendations' },
  ],
}
