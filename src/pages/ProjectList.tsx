import { useStore } from '@/store/useStore'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { FolderOpen, Plus, Search, Flame, Calendar, ChevronRight, Filter, X, MapPin, Tag } from 'lucide-react'

const STATUS_OPTIONS = [
  { key: 'all', label: '全部' },
  { key: 'analyzing', label: '分析中' },
  { key: 'completed', label: '已完成' },
]

const SORT_OPTIONS = [
  { key: 'date', label: '按时间' },
  { key: 'heat', label: '按热度' },
]

const ACTIVITY_TYPES = ['黄金周', '音乐节', '灯会', '庙会', '其他'] as const

function getHeatColor(heat: number) {
  if (heat >= 80) return 'text-red-400'
  if (heat >= 60) return 'text-orange-400'
  if (heat >= 40) return 'text-yellow-400'
  return 'text-green-400'
}

export default function ProjectList() {
  const navigate = useNavigate()
  const { projects, selectedFilters, setSelectedFilters, addProject } = useStore()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    name: '',
    scenicSpot: '',
    activityType: '黄金周' as typeof ACTIVITY_TYPES[number],
    startDate: '',
    endDate: '',
  })

  const filtered = projects
    .filter((p) => {
      if (selectedFilters.status !== 'all' && p.status !== selectedFilters.status) return false
      if (search && !p.name.includes(search) && !p.scenicSpot.includes(search)) return false
      return true
    })
    .sort((a, b) => {
      if (selectedFilters.sortBy === 'heat') return b.heatIndex - a.heatIndex
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    })

  const handleCreate = () => {
    const id = `proj-${Date.now()}`
    addProject({
      id,
      name: form.name,
      scenicSpot: form.scenicSpot,
      activityType: form.activityType,
      startDate: form.startDate,
      endDate: form.endDate,
      status: 'analyzing',
      heatIndex: 0,
      tags: [form.activityType, form.scenicSpot],
    })
    setShowModal(false)
    setForm({ name: '', scenicSpot: '', activityType: '黄金周', startDate: '', endDate: '' })
    navigate(`/project/${id}`)
  }

  return (
    <div className="min-h-screen bg-dark-900">
      <header className="border-b border-dark-600 bg-dark-800/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FolderOpen className="w-6 h-6 text-accent" />
            <div>
              <h1 className="text-lg font-bold text-dark-100">舆情研判工作台</h1>
              <p className="text-xs text-dark-300">文旅集团深度复盘工具</p>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-dim text-dark-900 font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            新建项目
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-5">
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="flex items-center gap-1 bg-dark-800 rounded-full p-1 border border-dark-600">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSelectedFilters({ status: opt.key })}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedFilters.status === opt.key
                    ? 'bg-accent text-dark-900'
                    : 'text-dark-300 hover:text-dark-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-dark-800 rounded-full p-1 border border-dark-600">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSelectedFilters({ sortBy: opt.key })}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedFilters.sortBy === opt.key
                    ? 'bg-dark-700 text-accent'
                    : 'text-dark-300 hover:text-dark-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="relative ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索项目名称或景区..."
              className="pl-9 pr-4 py-2 bg-dark-800 border border-dark-600 rounded-lg text-sm text-dark-100 placeholder:text-dark-400 focus:outline-none focus:border-accent transition-colors w-64"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-dark-400 hover:text-dark-200" />
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((project, idx) => (
            <div
              key={project.id}
              onClick={() => navigate(`/project/${project.id}`)}
              className="animate-fade-in-up glow-accent-hover group relative flex bg-dark-800 border border-dark-600 rounded-xl overflow-hidden cursor-pointer hover:border-accent/50 transition-all"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <div
                className={`w-1 shrink-0 ${
                  project.status === 'completed' ? 'bg-success' : 'bg-ferment'
                }`}
              />
              <div className="flex-1 p-5 min-w-0">
                <h3 className="font-bold text-lg text-dark-100 mb-2 truncate group-hover:text-accent transition-colors">
                  {project.name}
                </h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-dark-300 mb-3">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {project.scenicSpot}
                  </span>
                  <span className="px-2 py-0.5 bg-dark-700 text-dark-200 rounded text-xs">
                    {project.activityType}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {project.startDate} ~ {project.endDate}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`flex items-center gap-1 text-sm font-semibold ${getHeatColor(project.heatIndex)}`}>
                      <Flame className="w-4 h-4" />
                      {project.heatIndex}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Tag className="w-3 h-3 text-dark-400" />
                      {project.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="px-1.5 py-0.5 bg-dark-700 text-dark-300 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-dark-500 group-hover:text-accent transition-colors" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20 text-dark-400">
            <Filter className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>暂无匹配的项目</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="glass-panel rounded-2xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-dark-100">新建项目</h2>
              <button onClick={() => setShowModal(false)} className="text-dark-400 hover:text-dark-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-dark-300 mb-1">项目名称</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-sm text-dark-100 focus:outline-none focus:border-accent transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-1">景区名称</label>
                <input
                  value={form.scenicSpot}
                  onChange={(e) => setForm({ ...form, scenicSpot: e.target.value })}
                  className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-sm text-dark-100 focus:outline-none focus:border-accent transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-1">活动类型</label>
                <select
                  value={form.activityType}
                  onChange={(e) => setForm({ ...form, activityType: e.target.value as typeof ACTIVITY_TYPES[number] })}
                  className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-sm text-dark-100 focus:outline-none focus:border-accent transition-colors"
                >
                  {ACTIVITY_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-dark-300 mb-1">开始日期</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-sm text-dark-100 focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-dark-300 mb-1">结束日期</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-sm text-dark-100 focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-dark-300 hover:text-dark-100 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={!form.name || !form.scenicSpot || !form.startDate || !form.endDate}
                className="px-4 py-2 text-sm bg-accent hover:bg-accent-dim text-dark-900 font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                创建并进入
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
