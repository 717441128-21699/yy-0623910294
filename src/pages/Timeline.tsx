import { useStore } from '@/store/useStore'
import { useParams, useNavigate } from 'react-router-dom'
import { useState, useMemo } from 'react'
import {
  ArrowLeft, Users, MessageSquare, TrendingUp, TrendingDown, Minus,
  Flame, Snowflake, RefreshCw, Radio, Share2, Newspaper, Shield,
  X, Check, FileText, Lightbulb, ChevronDown, ChevronRight, Target, AlertTriangle, Zap
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import type { TimelineEvent, RoleType, NodeType, SentimentType } from '@/types'
import { ROLE_LABELS, NODE_TYPE_LABELS, SENTIMENT_LABELS } from '@/types'
const NODE_ICON_MAP: Record<NodeType, React.ElementType> = {
  breakout: Flame, cooldown: Snowflake, re_ferment: RefreshCw,
  origin: Radio, spread: Share2, media_relay: Newspaper, official_response: Shield,
}

const NODE_COLOR_MAP: Record<NodeType, string> = {
  breakout: 'text-breakout', cooldown: 'text-cooldown', re_ferment: 'text-ferment',
  origin: 'text-dark-400', spread: 'text-dark-400', media_relay: 'text-dark-400',
  official_response: 'text-cooldown',
}

const NODE_BG_MAP: Record<NodeType, string> = {
  breakout: 'bg-breakout', cooldown: 'bg-cooldown', re_ferment: 'bg-ferment',
  origin: 'bg-dark-500', spread: 'bg-dark-500', media_relay: 'bg-dark-500',
  official_response: 'bg-cooldown',
}

const NODE_BORDER_MAP: Record<NodeType, string> = {
  breakout: 'border-breakout', cooldown: 'border-cooldown', re_ferment: 'border-ferment',
  origin: 'border-dark-500', spread: 'border-dark-500', media_relay: 'border-dark-500',
  official_response: 'border-cooldown',
}

const NODE_BADGE_BG: Record<NodeType, string> = {
  breakout: 'bg-breakout/15 text-breakout', cooldown: 'bg-cooldown/15 text-cooldown',
  re_ferment: 'bg-ferment/15 text-ferment', origin: 'bg-dark-500/30 text-dark-300',
  spread: 'bg-dark-500/30 text-dark-300', media_relay: 'bg-dark-500/30 text-dark-300',
  official_response: 'bg-cooldown/15 text-cooldown',
}

const SENTIMENT_BADGE: Record<string, string> = {
  positive: 'bg-success/15 text-success', negative: 'bg-breakout/15 text-breakout',
  neutral: 'bg-dark-500/30 text-dark-400',
}

const ROLE_BADGE: Record<RoleType, string> = {
  tourist: 'bg-blue-500/15 text-blue-400', local_resident: 'bg-purple-500/15 text-purple-400',
  media: 'bg-amber-500/15 text-amber-400', influencer: 'bg-pink-500/15 text-pink-400',
  travel_agency: 'bg-teal-500/15 text-teal-400',
}

const SENTIMENT_DOT: Record<string, string> = {
  positive: 'bg-success', negative: 'bg-breakout', neutral: 'bg-dark-500',
}
const ALL_ROLES: RoleType[] = ['tourist', 'local_resident', 'media', 'influencer', 'travel_agency']

const SENTIMENT_FILTERS: Array<{ key: SentimentType | 'all'; label: string }> = [
  { key: 'all', label: '全部' }, { key: 'positive', label: '正面' },
  { key: 'neutral', label: '中性' }, { key: 'negative', label: '负面' },
]
const CONFIRMED_FILTERS: Array<{ key: 'all' | 'confirmed' | 'unconfirmed'; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'confirmed', label: '已确认' },
  { key: 'unconfirmed', label: '待确认' },
]

function formatTime(ts: string) {
  const d = new Date(ts)
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
function formatDate(ts: string) {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()}`
}
function SentimentIcon({ sentiment }: { sentiment: string }) {
  if (sentiment === 'positive') return <TrendingUp size={12} />
  if (sentiment === 'negative') return <TrendingDown size={12} />
  return <Minus size={12} />
}
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-dark-300 text-xs font-mono mb-1">{label}</p>
      {payload.map((s: any) => (
        <p key={s.name} className="text-xs" style={{ color: s.color }}>{s.name === 'positive' ? '正面' : '负面'}: {s.value}</p>
      ))}
    </div>
  )
}

function InsightCategory({ icon: Icon, title, items, color }: {
  icon: React.ElementType; title: string; items: string[]; color: string
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon size={11} className={color} />
        <span className="text-xs font-bold">{title}</span>
      </div>
      {items.length > 0 ? (
        <ul className="space-y-1 pl-5">
          {items.map((item, i) => <li key={i} className={`text-xs ${color} list-disc`}>{item}</li>)}
        </ul>
      ) : <p className="text-xs text-dark-400 pl-5">（暂无）</p>}
    </div>
  )
}

export default function Timeline() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    getProjectById, getEventsByProject, getOpinionsByProject,
    opinionPanelOpen, toggleOpinionPanel, activeRoleFilters, setActiveRoleFilters,
    confirmOpinionItem, updateOpinionItem,
    opinionFilter, setOpinionFilter, resetOpinionFilter, batchConfirmByProject,
    generateOpinionInsights,
  } = useStore()

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [toastVisible, setToastVisible] = useState(false)
  const [insightsExpanded, setInsightsExpanded] = useState(false)
  const [expandedRoles, setExpandedRoles] = useState<Set<RoleType>>(new Set())

  const ChevronIcon = ({ e, s = 12 }: { e: boolean; s?: number }) =>
    e ? <ChevronDown size={s} className="text-dark-400" /> : <ChevronRight size={s} className="text-dark-400" />

  const toggleRoleFilter = (role: RoleType) => setActiveRoleFilters(
    activeRoleFilters.includes(role) ? activeRoleFilters.filter((r) => r !== role) : [...activeRoleFilters, role]
  )
  const handleBatchConfirm = () => {
    batchConfirmByProject(id!)
    setToastVisible(true)
    setTimeout(() => setToastVisible(false), 2000)
  }
  const toggleRoleInsight = (role: RoleType) => setExpandedRoles((prev) => {
    const next = new Set(prev)
    next.has(role) ? next.delete(role) : next.add(role)
    return next
  })
  const project = getProjectById(id!)
  const events = useMemo(
    () => getEventsByProject(id!).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [id],
  )
  const opinions = getOpinionsByProject(id!)

  const chartData = useMemo(() => {
    const map = new Map<string, { date: string; positive: number; negative: number; neutral: number }>()
    events.forEach((e) => {
      const key = formatDate(e.timestamp)
      const d = map.get(key) || { date: key, positive: 0, negative: 0, neutral: 0 }
      d[e.sentiment]++; map.set(key, d)
    })
    return Array.from(map.values())
  }, [events])

  const referenceEvents = useMemo(
    () => events.filter((e) => ['breakout', 'cooldown', 're_ferment'].includes(e.nodeType)),
    [events],
  )

  const uniquePlatforms = useMemo(() => {
    const set = new Set<string>()
    opinions.forEach((o) => set.add(o.platform))
    return Array.from(set)
  }, [opinions])

  const filteredOpinions = useMemo(() => {
    return opinions.filter((o) => {
      if (activeRoleFilters.length > 0 && !activeRoleFilters.includes(o.role)) return false
      if (opinionFilter.sentiment !== 'all' && o.sentiment !== opinionFilter.sentiment) return false
      if (opinionFilter.platform !== '' && o.platform !== opinionFilter.platform) return false
      if (opinionFilter.confirmed === 'confirmed' && !o.confirmed) return false
      if (opinionFilter.confirmed === 'unconfirmed' && o.confirmed) return false
      return true
    })
  }, [opinions, activeRoleFilters, opinionFilter])

  const opinionInsights = useMemo(
    () => generateOpinionInsights(id!, filteredOpinions),
    [id, filteredOpinions, generateOpinionInsights]
  )
  const roleCounts = useMemo(() => {
    const counts = {} as Record<RoleType, number>
    ALL_ROLES.forEach((r) => (counts[r] = 0))
    opinions.forEach((o) => counts[o.role]++)
    return counts
  }, [opinions])
  const roleSentimentStats = useMemo(() => {
    const stats = {} as Record<RoleType, { total: number; positive: number; neutral: number; negative: number }>
    ALL_ROLES.forEach((r) => (stats[r] = { total: 0, positive: 0, neutral: 0, negative: 0 }))
    opinions.forEach((o) => { stats[o.role].total++; stats[o.role][o.sentiment]++ })
    return stats
  }, [opinions])

  return (
    <div className="h-screen flex flex-col bg-dark-900 text-dark-100 overflow-hidden">
      <header className="flex items-center justify-between px-5 h-12 border-b border-dark-600 bg-dark-800 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-1.5 rounded-md hover:bg-dark-700 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-sm font-medium truncate">{project?.name ?? '事件时间线'}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleOpinionPanel}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
              opinionPanelOpen ? 'bg-accent/15 text-accent' : 'bg-dark-700 text-dark-300 hover:text-dark-100'
            }`}>
            <Users size={14} />观点分层
          </button>
          <button onClick={() => navigate(`/project/${id}/report`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-dark-700 text-dark-300 hover:text-dark-100 transition-colors">
            <FileText size={14} />复盘输出
          </button>
        </div>
      </header>

      <div className="h-[180px] shrink-0 border-b border-dark-600 bg-dark-800/50 px-5 pt-3">
        <div className="flex items-center gap-2 mb-1">
          <MessageSquare size={13} className="text-accent" />
          <span className="text-xs text-dark-400">情感趋势</span>
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6E7681' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#6E7681' }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} />
            {referenceEvents.map((e) => (
              <ReferenceLine
                key={e.id}
                x={formatDate(e.timestamp)}
                stroke={e.nodeType === 'breakout' ? '#F85149' : e.nodeType === 'cooldown' ? '#79C0FF' : '#D29922'}
                strokeDasharray="4 4"
                strokeWidth={1}
              />
            ))}
            <Area type="monotone" dataKey="negative" stroke="#F85149" fill="#F85149" fillOpacity={0.1} strokeWidth={1.5} />
            <Area type="monotone" dataKey="positive" stroke="#3FB950" fill="#3FB950" fillOpacity={0.1} strokeWidth={1.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex-1 overflow-y-auto relative">
        <div className="node-line py-8 px-5">
          <div className="relative max-w-4xl mx-auto">
            {events.map((event, idx) => {
              const isLeft = idx % 2 === 0
              const isExpanded = expandedId === event.id
              const NodeIcon = NODE_ICON_MAP[event.nodeType]

              return (
                <div key={event.id} className={`flex items-start mb-8 animate-fade-in-up ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}>
                  <div className={`w-[calc(50%-24px)] ${isLeft ? 'pr-8 text-right' : 'pl-8 text-left'}`}>
                    <div className="bg-dark-800 border border-dark-600 rounded-lg p-4 max-w-md ml-auto mr-0 hover:border-dark-500 transition-colors cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : event.id)}
                    >
                      <div className={`flex items-center gap-2 mb-2 ${isLeft ? 'justify-end' : 'justify-start'}`}>
                        <span className="font-mono text-dark-400 text-xs">{formatTime(event.timestamp)}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${NODE_BADGE_BG[event.nodeType]}`}>
                          {NODE_TYPE_LABELS[event.nodeType]}
                        </span>
                      </div>
                      <p className="font-medium text-sm mb-1">{event.title}</p>
                      <p className={`text-dark-300 text-sm ${isExpanded ? '' : 'line-clamp-3'}`}>{event.content}</p>
                      <div className={`flex items-center gap-2 mt-2 ${isLeft ? 'justify-end' : 'justify-start'}`}>
                        <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${SENTIMENT_BADGE[event.sentiment]}`}>
                          <SentimentIcon sentiment={event.sentiment} />
                          {SENTIMENT_LABELS[event.sentiment]}
                        </span>
                        <span className="text-[10px] text-dark-400 flex items-center gap-1">
                          <Share2 size={10} />{event.spreadCount.toLocaleString()}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${ROLE_BADGE[event.role]}`}>
                          {ROLE_LABELS[event.role]}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="w-12 shrink-0 flex justify-center relative z-10">
                    <div
                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center
                        ${NODE_BG_MAP[event.nodeType]} ${NODE_BORDER_MAP[event.nodeType]}
                        ${event.nodeType === 'breakout' ? 'animate-pulse-breakout' : ''}
                        ${event.nodeType === 're_ferment' ? 'animate-spin-slow' : ''}
                      `}
                    >
                      <NodeIcon size={14} className={`${NODE_COLOR_MAP[event.nodeType]} bg-transparent`} />
                    </div>
                  </div>

                  <div className="w-[calc(50%-24px)]" />
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {opinionPanelOpen && (
        <div className="fixed top-0 right-0 h-full w-[380px] bg-dark-800 border-l border-dark-600 z-50 animate-slide-in-right flex flex-col">
          <div className="flex items-center justify-between px-4 h-12 border-b border-dark-600 shrink-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-medium">观点分层</h2>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-dark-600 text-dark-300">
                筛选后 {filteredOpinions.length} 条
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleBatchConfirm}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] bg-success/15 text-success hover:bg-success/25 transition-colors"
              >
                <Check size={11} />
                全部确认
              </button>
              <button onClick={toggleOpinionPanel} className="p-1.5 rounded-md hover:bg-dark-700 transition-colors">
                <X size={16} />
              </button>
            </div>
          </div>

          {toastVisible && (
            <div className="absolute top-14 right-4 z-60 animate-fade-in-up">
              <div className="bg-success/90 text-white text-[11px] px-3 py-1.5 rounded-md shadow-lg flex items-center gap-1">
                <Check size={12} />
                批量确认成功
              </div>
            </div>
          )}

          <div className="px-4 py-3 border-b border-dark-600 shrink-0 space-y-2.5">
            <div className="flex flex-wrap gap-1.5">
              {ALL_ROLES.map((role) => (
                <button
                  key={role}
                  onClick={() => toggleRoleFilter(role)}
                  className={`flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md border transition-colors ${
                    activeRoleFilters.includes(role)
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-dark-600 text-dark-400 hover:text-dark-200'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${activeRoleFilters.includes(role) ? 'bg-accent' : 'bg-dark-500'}`} />
                  {ROLE_LABELS[role]}
                  <span className="text-dark-500">{roleCounts[role]}</span>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {SENTIMENT_FILTERS.map((sf) => (
                <button
                  key={sf.key}
                  onClick={() => setOpinionFilter({ sentiment: sf.key })}
                  className={`text-[11px] px-2.5 py-1 rounded-full transition-colors ${
                    opinionFilter.sentiment === sf.key
                      ? sf.key === 'positive'
                        ? 'bg-success/20 text-success'
                        : sf.key === 'negative'
                          ? 'bg-breakout/20 text-breakout'
                          : sf.key === 'neutral'
                            ? 'bg-dark-500/40 text-dark-200'
                            : 'bg-accent/20 text-accent'
                      : 'bg-dark-700 text-dark-400 hover:text-dark-200'
                  }`}
                >
                  {sf.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={opinionFilter.platform}
                onChange={(e) => setOpinionFilter({ platform: e.target.value })}
                className="text-[11px] bg-dark-700 border border-dark-600 rounded-md px-2 py-1 text-dark-300 outline-none flex-1 min-w-0"
              >
                <option value="">全部平台</option>
                {uniquePlatforms.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <select
                value={opinionFilter.confirmed}
                onChange={(e) => setOpinionFilter({ confirmed: e.target.value as 'all' | 'confirmed' | 'unconfirmed' })}
                className="text-[11px] bg-dark-700 border border-dark-600 rounded-md px-2 py-1 text-dark-300 outline-none flex-1 min-w-0"
              >
                {CONFIRMED_FILTERS.map((cf) => (
                  <option key={cf.key} value={cf.key}>确认状态: {cf.label}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end">
              <button onClick={() => { resetOpinionFilter(); setActiveRoleFilters([]) }}
                className="text-[11px] px-2.5 py-1 rounded-md bg-dark-700 text-dark-400 hover:text-dark-200 transition-colors">
                重置筛选
              </button>
            </div>
          </div>

          <div className="px-4 py-2.5 border-b border-dark-600 shrink-0">
            <div className="grid grid-cols-5 gap-1.5">
              {ALL_ROLES.map((role) => {
                const stat = roleSentimentStats[role]
                const posPct = stat.total > 0 ? Math.round((stat.positive / stat.total) * 100) : 0
                const neuPct = stat.total > 0 ? Math.round((stat.neutral / stat.total) * 100) : 0
                const negPct = stat.total > 0 ? 100 - posPct - neuPct : 0
                return (
                  <div key={role} className="bg-dark-700/50 rounded-md p-1.5 border border-dark-600/50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] text-dark-400 truncate">{ROLE_LABELS[role]}</span>
                      <span className="text-[9px] text-dark-500">{stat.total}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full overflow-hidden flex bg-dark-600">
                      {stat.total > 0 && (
                        <>
                          {posPct > 0 && <div className="h-full" style={{ width: `${posPct}%`, backgroundColor: '#3FB950' }} />}
                          {neuPct > 0 && <div className="h-full" style={{ width: `${neuPct}%`, backgroundColor: '#30363D' }} />}
                          {negPct > 0 && <div className="h-full" style={{ width: `${negPct}%`, backgroundColor: '#F85149' }} />}
                        </>
                      )}
                    </div>
                    <div className="flex justify-between mt-1">
                      {stat.total > 0 ? (
                        <>
                          <span className="text-[8px]" style={{ color: '#3FB950' }}>{posPct}%</span>
                          <span className="text-[8px] text-dark-500">{neuPct}%</span>
                          <span className="text-[8px]" style={{ color: '#F85149' }}>{negPct}%</span>
                        </>
                      ) : <span className="text-[8px] text-dark-600 w-full text-center">--</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="border-t border-dark-600 px-4 py-2.5 shrink-0">
            <button
              onClick={() => setInsightsExpanded(!insightsExpanded)}
              className="w-full flex items-center justify-between text-left hover:bg-dark-700/50 rounded-md px-2 py-1.5 -mx-2 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Lightbulb size={14} className="text-accent" />
                <span className="text-sm font-medium">复盘洞察</span>
              </div>
              <ChevronIcon e={insightsExpanded} s={14} />

            </button>

            {insightsExpanded && <div className="mt-2 space-y-2">
              {filteredOpinions.length === 0 ? <div className="text-center py-4 text-dark-500 text-xs">调整筛选条件后自动生成洞察</div> : (
                ALL_ROLES.map((role) => {
                  const cnt = filteredOpinions.filter((o) => o.role === role).length
                  if (cnt === 0) return null
                  const insight = opinionInsights[role]
                  const isRoleExpanded = expandedRoles.has(role)
                  return (
                    <div key={role} className="bg-dark-700/50 rounded-lg border border-dark-600/50 overflow-hidden">
                      <button onClick={() => toggleRoleInsight(role)} className="w-full flex items-center justify-between text-left px-3 py-2 hover:bg-dark-600/30 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${ROLE_BADGE[role]}`}>{ROLE_LABELS[role]}</span>
                          <span className="text-[10px] text-dark-500">{cnt}条观点</span>
                        </div>
                        <ChevronIcon e={isRoleExpanded} />
                      </button>
                      {isRoleExpanded && <div className="px-3 pb-3 space-y-2.5">
                        <InsightCategory icon={Target} title="主要诉求" items={insight.demands} color="text-dark-300" />
                        <InsightCategory icon={AlertTriangle} title="风险点" items={insight.risks} color="text-breakout" />
                        <InsightCategory icon={Zap} title="建议动作" items={insight.suggestions} color="text-success" />
                      </div>}
                    </div>
                  )
                })
              )}
            </div>}
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {ALL_ROLES.map((role) => {
              const items = filteredOpinions.filter((o) => o.role === role)
              if (items.length === 0) return null
              return (
                <div key={role}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${ROLE_BADGE[role]}`}>{ROLE_LABELS[role]}</span>
                    <span className="text-[10px] text-dark-500">{items.length}条</span>
                  </div>
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className={`bg-dark-700/50 rounded-lg p-3 border border-dark-600/50 ${!item.confirmed ? 'border-l-2 border-l-ferment' : ''}`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">{item.author}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-dark-600 text-dark-300">{item.platform}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className={`w-2 h-2 rounded-full ${SENTIMENT_DOT[item.sentiment]}`} />
                            <span className="text-[10px] text-dark-400">{SENTIMENT_LABELS[item.sentiment]}</span>
                          </div>
                        </div>
                        <p className="text-xs text-dark-300 leading-relaxed mb-2">{item.content}</p>
                        <div className="flex items-center justify-between">
                          <select
                            value={item.role}
                            onChange={(e) => updateOpinionItem(item.id, { role: e.target.value as RoleType })}
                            className="text-[10px] bg-dark-600 border border-dark-500 rounded px-1.5 py-0.5 text-dark-300 outline-none"
                          >
                            {ALL_ROLES.map((r) => (
                              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => !item.confirmed && confirmOpinionItem(item.id)}
                            className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full transition-colors ${
                              item.confirmed
                                ? 'bg-success/15 text-success'
                                : 'bg-dark-600 text-dark-400 hover:text-dark-200'
                            }`}
                          >
                            {item.confirmed ? <Check size={10} /> : <span className="w-2 h-2 rounded-full bg-dark-500" />}
                            {item.confirmed ? '已确认' : '确认'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
            {filteredOpinions.length === 0 && <div className="text-center py-8 text-dark-500 text-xs">暂无匹配的观点数据</div>}
          </div>
        </div>
      )}
    </div>
  )
}
