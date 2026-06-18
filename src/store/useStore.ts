import { create } from 'zustand'
import type { Project, TimelineEvent, OpinionItem, ReportMaterial, RoleType } from '@/types'
import { mockProjects, mockTimelineEvents, mockOpinionItems, mockReportMaterials } from '@/data/mockData'

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

  setCurrentProject: (id: string | null) => void
  addProject: (project: Project) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  deleteProject: (id: string) => void
  setSelectedFilters: (filters: Partial<{ status: string; sortBy: string }>) => void
  setActiveRoleFilters: (roles: RoleType[]) => void
  toggleOpinionPanel: () => void
  setSelectedEventId: (id: string | null) => void
  updateOpinionItem: (id: string, updates: Partial<OpinionItem>) => void
  confirmOpinionItem: (id: string) => void
  toggleMaterialSelection: (id: string) => void
  updateMaterialOrder: (id: string, newOrder: number) => void
  getProjectById: (id: string) => Project | undefined
  getEventsByProject: (projectId: string) => TimelineEvent[]
  getOpinionsByProject: (projectId: string) => OpinionItem[]
  getMaterialsByProject: (projectId: string) => ReportMaterial[]
}

export const useStore = create<StoreState>((set, get) => ({
  projects: mockProjects,
  currentProjectId: null,
  timelineEvents: mockTimelineEvents,
  opinionItems: mockOpinionItems,
  reportMaterials: mockReportMaterials,
  selectedFilters: { status: 'all', sortBy: 'date' },
  activeRoleFilters: [],
  opinionPanelOpen: false,
  selectedEventId: null,

  setCurrentProject: (id) => set({ currentProjectId: id }),

  addProject: (project) => set((state) => ({ projects: [...state.projects, project] })),

  updateProject: (id, updates) => set((state) => ({
    projects: state.projects.map((p) => p.id === id ? { ...p, ...updates } : p),
  })),

  deleteProject: (id) => set((state) => ({
    projects: state.projects.filter((p) => p.id !== id),
  })),

  setSelectedFilters: (filters) => set((state) => ({
    selectedFilters: { ...state.selectedFilters, ...filters },
  })),

  setActiveRoleFilters: (roles) => set({ activeRoleFilters: roles }),

  toggleOpinionPanel: () => set((state) => ({ opinionPanelOpen: !state.opinionPanelOpen })),

  setSelectedEventId: (id) => set({ selectedEventId: id }),

  updateOpinionItem: (id, updates) => set((state) => ({
    opinionItems: state.opinionItems.map((item) => item.id === id ? { ...item, ...updates } : item),
  })),

  confirmOpinionItem: (id) => set((state) => ({
    opinionItems: state.opinionItems.map((item) => item.id === id ? { ...item, confirmed: true } : item),
  })),

  toggleMaterialSelection: (id) => set((state) => ({
    reportMaterials: state.reportMaterials.map((m) => m.id === id ? { ...m, selected: !m.selected } : m),
  })),

  updateMaterialOrder: (id, newOrder) => set((state) => ({
    reportMaterials: state.reportMaterials.map((m) => m.id === id ? { ...m, sortOrder: newOrder } : m),
  })),

  getProjectById: (id) => get().projects.find((p) => p.id === id),

  getEventsByProject: (projectId) => get().timelineEvents.filter((e) => e.projectId === projectId),

  getOpinionsByProject: (projectId) => get().opinionItems.filter((o) => o.projectId === projectId),

  getMaterialsByProject: (projectId) => get().reportMaterials.filter((m) => m.projectId === projectId),
}))
