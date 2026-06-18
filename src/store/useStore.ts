import { create } from 'zustand'
import type { Project, TimelineEvent, OpinionItem, ReportMaterial, RoleType, SentimentType, ReportTemplateType, ReportDraft, ImportTargetType, ImportFieldPreview, ImportPreviewData, OpinionFilterState, InsertedInsight, OpinionInsight } from '@/types'
import { REPORT_TEMPLATES } from '@/types'
import { mockProjects, mockTimelineEvents, mockOpinionItems, mockReportMaterials } from '@/data/mockData'

const STORAGE_KEY = 'sentiment_analysis_store_v1'

interface ImportPayload {
  project: Project
  events?: TimelineEvent[]
  opinions?: OpinionItem[]
  materials?: ReportMaterial[]
}

interface StoreState {
  projects: Project[]
  currentProjectId: string | null
  timelineEvents: TimelineEvent[]
  opinionItems: OpinionItem[]
  reportMaterials: ReportMaterial[]
  selectedFilters: { status: string; sortBy: string }
  activeRoleFilters: RoleType[]
  opinionPanelOpen: boolean
  selectedEventId: string | null
  opinionFilter: OpinionFilterState
  reportGeneratedAt: string | null
  currentReportTemplate: ReportTemplateType
  reportDrafts: ReportDraft[]
  currentDraftId: string | null
  importPreview: ImportPreviewData | null
  insertedInsights: InsertedInsight[]
  importSummary: { events: number; opinions: number; materials: number } | null
  manualAnalysisText: string
  viewDraftId: string | null

  setCurrentProject: (id: string | null) => void
  addProject: (project: Project) => void
  importProject: (payload: ImportPayload) => string
  updateProject: (id: string, updates: Partial<Project>) => void
  deleteProject: (id: string) => void
  setSelectedFilters: (filters: Partial<{ status: string; sortBy: string }>) => void
  setActiveRoleFilters: (roles: RoleType[]) => void
  toggleOpinionPanel: () => void
  setOpinionPanelOpen: (open: boolean) => void
  setSelectedEventId: (id: string | null) => void
  setOpinionFilter: (filter: Partial<OpinionFilterState>) => void
  resetOpinionFilter: () => void
  updateOpinionItem: (id: string, updates: Partial<OpinionItem>) => void
  confirmOpinionItem: (id: string) => void
  batchConfirmByProject: (projectId: string) => void
  toggleMaterialSelection: (id: string) => void
  setMaterialSelected: (id: string, selected: boolean) => void
  updateMaterialOrder: (id: string, newOrder: number) => void
  swapMaterialOrder: (idA: string, idB: string) => void
  markReportGenerated: () => void
  getProjectById: (id: string) => Project | undefined
  getEventsByProject: (projectId: string) => TimelineEvent[]
  getOpinionsByProject: (projectId: string) => OpinionItem[]
  getMaterialsByProject: (projectId: string) => ReportMaterial[]
  resetStore: () => void
  setCurrentReportTemplate: (template: ReportTemplateType) => void
  saveReportDraft: (draft: Omit<ReportDraft, 'id'>) => string
  setCurrentDraftId: (id: string | null) => void
  deleteDraft: (id: string) => void
  getDraftByProject: (projectId: string) => ReportDraft | undefined
  setImportPreview: (preview: ImportPreviewData | null) => void
  updateFieldMapping: (sourceKey: string, updates: Partial<ImportFieldPreview>) => void
  generateOpinionInsights: (projectId: string, filteredOpinions?: OpinionItem[]) => Record<RoleType, { demands: string[]; risks: string[]; suggestions: string[] }>
  getDraftsByProject: (projectId: string) => ReportDraft[]
  switchToDraft: (draftId: string) => void
  clearViewDraft: () => void
  deleteDraftById: (draftId: string) => void
  setManualAnalysis: (text: string) => void
  addInsertedInsights: (insights: InsertedInsight[]) => void
  setImportSummary: (summary: { events: number; opinions: number; materials: number } | null) => void
}

function loadPersistedState(): Partial<StoreState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed
  } catch {
    return null
  }
}

function persistState(state: StoreState) {
  try {
    const toSave: Partial<StoreState> = {
      projects: state.projects,
      timelineEvents: state.timelineEvents,
      opinionItems: state.opinionItems,
      reportMaterials: state.reportMaterials,
      selectedFilters: state.selectedFilters,
      activeRoleFilters: state.activeRoleFilters,
      reportDrafts: state.reportDrafts,
      currentReportTemplate: state.currentReportTemplate,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  } catch {
  }
}

function generateId(): string {
  return `dr-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}

const persisted = loadPersistedState()

export const useStore = create<StoreState>((set, get) => ({
  projects: persisted?.projects ?? mockProjects,
  currentProjectId: null,
  timelineEvents: persisted?.timelineEvents ?? mockTimelineEvents,
  opinionItems: persisted?.opinionItems ?? mockOpinionItems,
  reportMaterials: persisted?.reportMaterials ?? mockReportMaterials,
  selectedFilters: persisted?.selectedFilters ?? { status: 'all', sortBy: 'date' },
  activeRoleFilters: persisted?.activeRoleFilters ?? [],
  opinionPanelOpen: false,
  selectedEventId: null,
  opinionFilter: { sentiment: 'all', platform: '', confirmed: 'all' },
  reportGeneratedAt: null,
  currentReportTemplate: persisted?.currentReportTemplate ?? 'internal',
  reportDrafts: persisted?.reportDrafts ?? [],
  currentDraftId: null,
  importPreview: null,
  manualAnalysisText: '',
  insertedInsights: [],
  viewDraftId: null,
  importSummary: null,

  setCurrentProject: (id) => set({ currentProjectId: id }),

  addProject: (project) => set((state) => {
    const next = { projects: [...state.projects, project] }
    persistState({ ...state, ...next })
    return next
  }),

  importProject: ({ project, events = [], opinions = [], materials = [] }) => {
    const pid = project.id
    const newProject: Project = project
    const newEvents = events.map((e) => ({ ...e, projectId: pid }))
    const newOpinions = opinions.map((o) => ({ ...o, projectId: pid }))
    const newMaterials = materials.map((m) => ({ ...m, projectId: pid }))
    set((state) => {
      const next = {
        projects: [...state.projects, newProject],
        timelineEvents: [...state.timelineEvents, ...newEvents],
        opinionItems: [...state.opinionItems, ...newOpinions],
        reportMaterials: [...state.reportMaterials, ...newMaterials],
      }
      persistState({ ...state, ...next })
      return next
    })
    return pid
  },

  updateProject: (id, updates) => set((state) => {
    const next = {
      projects: state.projects.map((p) => p.id === id ? { ...p, ...updates } : p),
    }
    persistState({ ...state, ...next })
    return next
  }),

  deleteProject: (id) => set((state) => {
    const next = {
      projects: state.projects.filter((p) => p.id !== id),
      timelineEvents: state.timelineEvents.filter((e) => e.projectId !== id),
      opinionItems: state.opinionItems.filter((o) => o.projectId !== id),
      reportMaterials: state.reportMaterials.filter((m) => m.projectId !== id),
    }
    persistState({ ...state, ...next })
    return next
  }),

  setSelectedFilters: (filters) => set((state) => {
    const next = { selectedFilters: { ...state.selectedFilters, ...filters } }
    persistState({ ...state, ...next })
    return next
  }),

  setActiveRoleFilters: (roles) => set((state) => {
    const next = { activeRoleFilters: roles }
    persistState({ ...state, ...next })
    return next
  }),

  toggleOpinionPanel: () => set({ opinionPanelOpen: !get().opinionPanelOpen }),
  setOpinionPanelOpen: (open) => set({ opinionPanelOpen: open }),

  setSelectedEventId: (id) => set({ selectedEventId: id }),

  setOpinionFilter: (filter) => set((state) => ({
    opinionFilter: { ...state.opinionFilter, ...filter },
  })),

  resetOpinionFilter: () => set({
    opinionFilter: { sentiment: 'all', platform: '', confirmed: 'all' },
  }),

  updateOpinionItem: (id, updates) => set((state) => {
    const next = {
      opinionItems: state.opinionItems.map((item) => item.id === id ? { ...item, ...updates } : item),
    }
    persistState({ ...state, ...next })
    return next
  }),

  confirmOpinionItem: (id) => set((state) => {
    const next = {
      opinionItems: state.opinionItems.map((item) => item.id === id ? { ...item, confirmed: true } : item),
    }
    persistState({ ...state, ...next })
    return next
  }),

  batchConfirmByProject: (projectId) => set((state) => {
    const next = {
      opinionItems: state.opinionItems.map((o) => o.projectId === projectId ? { ...o, confirmed: true } : o),
    }
    persistState({ ...state, ...next })
    return next
  }),

  toggleMaterialSelection: (id) => set((state) => {
    const next = {
      reportMaterials: state.reportMaterials.map((m) => m.id === id ? { ...m, selected: !m.selected } : m),
    }
    persistState({ ...state, ...next })
    return next
  }),

  setMaterialSelected: (id, selected) => set((state) => {
    const next = {
      reportMaterials: state.reportMaterials.map((m) => m.id === id ? { ...m, selected } : m),
    }
    persistState({ ...state, ...next })
    return next
  }),

  updateMaterialOrder: (id, newOrder) => set((state) => {
    const next = {
      reportMaterials: state.reportMaterials.map((m) => m.id === id ? { ...m, sortOrder: newOrder } : m),
    }
    persistState({ ...state, ...next })
    return next
  }),

  swapMaterialOrder: (idA, idB) => set((state) => {
    const a = state.reportMaterials.find((m) => m.id === idA)
    const b = state.reportMaterials.find((m) => m.id === idB)
    if (!a || !b) return state
    const orderA = a.sortOrder
    const orderB = b.sortOrder
    const next = {
      reportMaterials: state.reportMaterials.map((m) => {
        if (m.id === idA) return { ...m, sortOrder: orderB }
        if (m.id === idB) return { ...m, sortOrder: orderA }
        return m
      }),
    }
    persistState({ ...state, ...next })
    return next
  }),

  markReportGenerated: () => {
    const ts = new Date().toISOString()
    set((state) => {
      const next = { reportGeneratedAt: ts }
      persistState({ ...state, ...next })
      return next
    })
  },

  getProjectById: (id) => get().projects.find((p) => p.id === id),
  getEventsByProject: (projectId) => get().timelineEvents.filter((e) => e.projectId === projectId),
  getOpinionsByProject: (projectId) => get().opinionItems.filter((o) => o.projectId === projectId),
  getMaterialsByProject: (projectId) => get().reportMaterials.filter((m) => m.projectId === projectId),

  resetStore: () => {
    localStorage.removeItem(STORAGE_KEY)
    set({
      projects: mockProjects,
      timelineEvents: mockTimelineEvents,
      opinionItems: mockOpinionItems,
      reportMaterials: mockReportMaterials,
      selectedFilters: { status: 'all', sortBy: 'date' },
      activeRoleFilters: [],
      opinionPanelOpen: false,
      selectedEventId: null,
      opinionFilter: { sentiment: 'all', platform: '', confirmed: 'all' },
      reportGeneratedAt: null,
      currentReportTemplate: 'internal',
      reportDrafts: [],
      currentDraftId: null,
      importPreview: null,
      manualAnalysisText: '',
      insertedInsights: [],
      viewDraftId: null,
      importSummary: null,
      currentProjectId: null,
    })
  },

  setCurrentReportTemplate: (template) => set((state) => {
    const next = { currentReportTemplate: template }
    persistState({ ...state, ...next })
    return next
  }),

  saveReportDraft: (draft) => {
    const state = get()
    const projectDrafts = state.reportDrafts.filter((d) => d.projectId === draft.projectId)
    const maxVersion = projectDrafts.length > 0 ? Math.max(...projectDrafts.map((d) => d.versionNumber)) : 0
    const versionNumber = maxVersion + 1
    const id = generateId()
    const insertedInsightsSection = JSON.stringify(state.insertedInsights)
    const newDraft: ReportDraft = {
      ...draft,
      id,
      versionNumber,
      manualAnalysis: state.manualAnalysisText,
      insertedInsightsSection,
    }
    set((s) => {
      const next = {
        reportDrafts: [...s.reportDrafts, newDraft],
        viewDraftId: id,
        currentDraftId: id,
      }
      persistState({ ...s, ...next })
      return next
    })
    get().markReportGenerated()
    return id
  },

  setCurrentDraftId: (id) => set({ currentDraftId: id }),

  deleteDraft: (id) => set((state) => {
    const next = {
      reportDrafts: state.reportDrafts.filter((d) => d.id !== id),
      currentDraftId: state.currentDraftId === id ? null : state.currentDraftId,
    }
    persistState({ ...state, ...next })
    return next
  }),

  getDraftByProject: (projectId) => {
    const drafts = get().reportDrafts.filter((d) => d.projectId === projectId)
    if (drafts.length === 0) return undefined
    return drafts.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())[0]
  },

  setImportPreview: (preview) => set({ importPreview: preview }),

  updateFieldMapping: (sourceKey, updates) => set((state) => {
    if (!state.importPreview) return state
    const next = {
      importPreview: {
        ...state.importPreview,
        fieldMappings: state.importPreview.fieldMappings.map((fm) =>
          fm.sourceKey === sourceKey ? { ...fm, ...updates } : fm
        ),
      },
    }
    return next
  }),

  generateOpinionInsights: (projectId, filteredOpinions) => {
    const opinions = filteredOpinions ?? get().getOpinionsByProject(projectId)
    const roles: RoleType[] = ['tourist', 'local_resident', 'media', 'influencer', 'travel_agency']
    const demandKeywords = ['希望', '要求', '建议', '需要', '能否', '改善']
    const riskKeywords = ['不满', '投诉', '曝光', '严重', '问题', '风险']

    const extractSentences = (content: string, keywords: string[]): string[] => {
      const sentences = content.split(/[。！？.!?]/).filter((s) => s.trim().length > 0)
      const matched = sentences.filter((s) => keywords.some((k) => s.includes(k)))
      return matched.slice(0, 3)
    }

    const generateSuggestions = (demands: string[]): string[] => {
      const suggestions: string[] = []
      for (const demand of demands) {
        if (demand.includes('停车场') || demand.includes('停车')) {
          suggestions.push('优化停车指引，增加停车位供给')
        } else if (demand.includes('排队') || demand.includes('等待')) {
          suggestions.push('优化排队管理，增设预约通道')
        } else if (demand.includes('卫生') || demand.includes('厕所')) {
          suggestions.push('加强环境卫生管理，提升保洁频次')
        } else if (demand.includes('服务') || demand.includes('态度')) {
          suggestions.push('加强服务人员培训，提升服务质量')
        } else if (demand.includes('价格') || demand.includes('贵')) {
          suggestions.push('优化定价策略，增加性价比')
        } else if (demand.includes('交通')) {
          suggestions.push('优化交通接驳，增加公共交通选项')
        } else if (demand.includes('餐饮') || demand.includes('吃')) {
          suggestions.push('丰富餐饮选择，提升餐饮品质')
        } else if (demand.includes('住宿') || demand.includes('酒店')) {
          suggestions.push('优化住宿配套，提升入住体验')
        }
      }
      return suggestions.slice(0, 3)
    }

    const result = {} as Record<RoleType, { demands: string[]; risks: string[]; suggestions: string[] }>

    for (const role of roles) {
      const roleOpinions = opinions.filter((o) => o.role === role)
      const demands: string[] = []
      const risks: string[] = []

      for (const opinion of roleOpinions) {
        const demandSnippets = extractSentences(opinion.content, demandKeywords)
        demands.push(...demandSnippets)

        if (opinion.sentiment === 'negative') {
          const riskSnippets = extractSentences(opinion.content, riskKeywords)
          risks.push(...riskSnippets)
        }
      }

      const uniqueDemands = [...new Set(demands)].slice(0, 3)
      const uniqueRisks = [...new Set(risks)].slice(0, 3)
      const suggestions = generateSuggestions(uniqueDemands)

      result[role] = {
        demands: uniqueDemands,
        risks: uniqueRisks,
        suggestions,
      }
    }

    return result
  },

  getDraftsByProject: (projectId) => {
    return get().reportDrafts
      .filter((d) => d.projectId === projectId)
      .sort((a, b) => b.versionNumber - a.versionNumber)
  },

  switchToDraft: (draftId) => {
    const state = get()
    const draft = state.reportDrafts.find((d) => d.id === draftId)
    if (!draft) return
    const materials = state.reportMaterials.filter((m) => m.projectId === draft.projectId)
    const setMatSel = state.setMaterialSelected
    materials.forEach((m) => {
      const shouldSelect = draft.materialIds.includes(m.id)
      if (m.selected !== shouldSelect) setMatSel(m.id, shouldSelect)
    })
    state.setCurrentReportTemplate(draft.template)
    state.markReportGenerated()
    let parsedInsights: InsertedInsight[] = []
    if (draft.insertedInsightsSection) {
      try {
        parsedInsights = JSON.parse(draft.insertedInsightsSection)
      } catch {
        parsedInsights = []
      }
    }
    set({
      manualAnalysisText: draft.manualAnalysis || '',
      insertedInsights: parsedInsights,
      viewDraftId: draftId,
    })
  },

  clearViewDraft: () => set({
    viewDraftId: null,
    manualAnalysisText: '',
    insertedInsights: [],
  }),

  deleteDraftById: (draftId) => {
    const state = get()
    const wasViewing = state.viewDraftId === draftId
    const wasCurrent = state.currentDraftId === draftId
    set((s) => {
      const next = {
        reportDrafts: s.reportDrafts.filter((d) => d.id !== draftId),
        currentDraftId: wasCurrent ? null : s.currentDraftId,
        viewDraftId: wasViewing ? null : s.viewDraftId,
        manualAnalysisText: wasViewing ? '' : s.manualAnalysisText,
        insertedInsights: wasViewing ? [] : s.insertedInsights,
      }
      persistState({ ...s, ...next })
      return next
    })
  },

  setManualAnalysis: (text) => set({ manualAnalysisText: text }),

  addInsertedInsights: (insights) => set((state) => {
    const merged = [...state.insertedInsights]
    for (const insight of insights) {
      const existingIdx = merged.findIndex((i) => i.role === insight.role)
      if (existingIdx >= 0) {
        merged[existingIdx] = insight
      } else {
        merged.push(insight)
      }
    }
    const next = { insertedInsights: merged }
    persistState({ ...state, ...next })
    return next
  }),

  setImportSummary: (summary) => set({ importSummary: summary }),
}))
