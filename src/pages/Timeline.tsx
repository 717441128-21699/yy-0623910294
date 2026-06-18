import { useStore } from '@/store/useStore'
import { useParams, useNavigate } from 'react-router-dom'
import { useState, useMemo } from 'react'
import {
  ArrowLeft, Users, MessageSquare, TrendingUp, TrendingDown, Minus,
  Flame, Snowflake, RefreshCw, Radio, Share2, Newspaper, Shield,
  Clock, ChevronRight, X, Check, AlertTriangle, FileText,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import type { TimelineEvent, RoleType, NodeType } from '@/types'
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
        <p key={s.name} className="text-xs" style={{ color: s.color }}>
          {s.name === 'positive' ? '正面' : '负面'}: {s.value}
        </p>
      ))}
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
  } = useStore()

  const [expandedId, setExpandedId] = useState<string | null>(null)

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
      d[e.sentiment]++
      map.set(key, d)
    })
    return Array.from(map.values())
  }, [events])

  const referenceEvents = useMemo(
    () => events.filter((e) => ['breakout', 'cooldown', 're_ferment'].includes(e.nodeType)),
    [events],
  )

  const filteredOpinions = useMemo(() => {
    if (activeRoleFilters.length === 0) return opinions
    return opinions.filter((o) => activeRoleFilters.includes(o.role))
  }, [opinions, activeRoleFilters])

  const roleCounts = useMemo(() => {
    const counts: Record<RoleType, number> = { tourist: 0, local_resident: 0, media: 0, influencer: 0, travel_agency: 0 }
    opinions.forEach((o) => counts[o.role]++)
    return counts
  }, [opinions])

  const toggleRoleFilter = (role: RoleType) => {
    if (activeRoleFilters.includes(role)) {
      setActiveRoleFilters(activeRoleFilters.filter((r) => r !== role))
    } else {
      setActiveRoleFilters([...activeRoleFilters, role])
    }
  }

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
          <button
            onClick={toggleOpinionPanel}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
              opinionPanelOpen ? 'bg-accent/15 text-accent' : 'bg-dark-700 text-dark-300 hover:text-dark-100'
            }`}
          >
            <Users size={14} />
            观点分层
          </button>
          <button
            onClick={() => navigate(`/project/${id}/report`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-dark-700 text-dark-300 hover:text-dark-100 transition-colors"
          >
            <FileText size={14} />
            复盘输出
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
              const isAnimated = event.nodeType === 'breakout' || event.nodeType === 're_ferment'

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
            <h2 className="text-sm font-medium">观点分层</h2>
            <button onClick={toggleOpinionPanel} className="p-1.5 rounded-md hover:bg-dark-700 transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="px-4 py-3 border-b border-dark-600 shrink-0">
            <div className="flex flex-wrap gap-2">
              {ALL_ROLES.map((role) => (
                <button
                  key={role}
                  onClick={() => toggleRoleFilter(role)}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border transition-colors ${
                    activeRoleFilters.includes(role)
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-dark-600 text-dark-400 hover:text-dark-200'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${activeRoleFilters.includes(role) ? 'bg-accent' : 'bg-dark-500'}`} />
                  {ROLE_LABELS[role]}
                  <span className="text-dark-500">{roleCounts[role]}</span>
                </button>
              ))}
            </div>
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
                      <div key={item.id} className="bg-dark-700/50 rounded-lg p-3 border border-dark-600/50">
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
          </div>
        </div>
      )}
    </div>
  )
}
