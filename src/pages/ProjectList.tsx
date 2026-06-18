import { useStore } from '@/store/useStore'
import { useNavigate } from 'react-router-dom'
import { useState, useRef, ChangeEvent, DragEvent, useMemo } from 'react'
import { FolderOpen, Plus, Search, Flame, Calendar, ChevronRight, Filter, X, MapPin, Tag, Upload, Minus, RefreshCw } from 'lucide-react'
import type { Project, TimelineEvent, OpinionItem, ReportMaterial, NodeType, RoleType, SentimentType, MaterialType, ImportTargetType, ImportFieldPreview, ImportPreviewData } from '@/types'
import { IMPORT_TARGET_LABELS } from '@/types'

const STATUS_OPTIONS = [{ key: 'all', label: '全部' }, { key: 'analyzing', label: '分析中' }, { key: 'completed', label: '已完成' }]
const SORT_OPTIONS = [{ key: 'date', label: '按时间' }, { key: 'heat', label: '按热度' }]
const ACTIVITY_TYPES = ['黄金周', '音乐节', '灯会', '庙会', '其他'] as const
const NODE_TYPES: NodeType[] = ['origin', 'spread', 'media_relay', 'official_response', 'breakout', 'cooldown', 're_ferment']
const ROLE_TYPES: RoleType[] = ['tourist', 'local_resident', 'media', 'influencer', 'travel_agency']
const SENTIMENTS: SentimentType[] = ['positive', 'neutral', 'negative']
const MATERIAL_TYPES: MaterialType[] = ['typical_post', 'spread_screenshot', 'action_taken', 'conclusion']
const NL: Record<NodeType, string> = { origin: '首发', spread: '扩散', media_relay: '媒体转述', official_response: '官方回应', breakout: '爆点', cooldown: '降温点', re_ferment: '二次发酵点' }
const RL: Record<RoleType, string> = { tourist: '游客', local_resident: '当地居民', media: '媒体', influencer: '自媒体达人', travel_agency: '旅行社' }
const SL: Record<SentimentType, string> = { positive: '正面', neutral: '中性', negative: '负面' }
const ML: Record<MaterialType, string> = { typical_post: '典型帖子', spread_screenshot: '传播截图', action_taken: '处置动作', conclusion: '结论' }
const SAMPLE_JSON = `{"project": {"name": "...", "scenicSpot": "...", "activityType": "黄金周", "startDate": "...", "endDate": "..."}, "events": [...], "opinions": [...], "materials": [...]}`
const PROJECT_FIELDS = ['name', 'scenicSpot', 'activityType', 'startDate', 'endDate', 'status', 'heatIndex', 'tags']
const EVENT_FIELDS = ['timestamp', 'title', 'content', 'nodeType', 'sentiment', 'spreadCount', 'sourceType', 'sourceAuthor', 'role']
const OPINION_FIELDS = ['role', 'content', 'author', 'platform', 'sentiment', 'confirmed']
const MATERIAL_FIELDS = ['type', 'title', 'content', 'sourceEventId', 'sortOrder', 'selected']
const FIELD_OPTS: Record<string, string[]> = { ignore: PROJECT_FIELDS, event: EVENT_FIELDS, opinion: OPINION_FIELDS, material: MATERIAL_FIELDS }

function getHeatColor(h: number) { return h >= 80 ? 'text-red-400' : h >= 60 ? 'text-orange-400' : h >= 40 ? 'text-yellow-400' : 'text-green-400' }

interface ER { timestamp: string; title: string; content: string; nodeType: NodeType; sentiment: SentimentType; spreadCount: number; sourceAuthor: string; role: RoleType }
interface OR { role: RoleType; content: string; author: string; platform: string; sentiment: SentimentType }
interface MR { type: MaterialType; title: string; content: string }
const eER = (): ER => ({ timestamp: '', title: '', content: '', nodeType: 'origin', sentiment: 'neutral', spreadCount: 500, sourceAuthor: '', role: 'tourist' })
const eOR = (): OR => ({ role: 'tourist', content: '', author: '', platform: '', sentiment: 'neutral' })
const eMR = (): MR => ({ type: 'typical_post', title: '', content: '' })
const inputCls = 'px-2 py-1 bg-dark-700 border border-dark-600 rounded text-xs text-dark-100 focus:outline-none focus:border-accent'

const matchField = (key: string, path: string[]): { target: ImportTargetType; field: string | null } => {
  const kl = key.toLowerCase()
  const inProject = path.some(p => p === 'project')
  const inEvents = path.some(p => p === 'events' || p === 'timeline')
  const inOpinions = path.some(p => p === 'opinions')
  const inMaterials = path.some(p => p === 'materials')
  if (/time|date|日期|时间/.test(kl)) return { target: 'event', field: 'timestamp' }
  if (/title|标题/.test(kl)) return { target: inMaterials ? 'material' : inOpinions ? 'opinion' : 'event', field: 'title' }
  if (/content|text|内容/.test(kl)) return { target: inMaterials ? 'material' : inOpinions ? 'opinion' : 'event', field: 'content' }
  if (/type|node|节点/.test(kl)) return { target: 'event', field: 'nodeType' }
  if (/sentiment|情绪/.test(kl)) return { target: inOpinions ? 'opinion' : 'event', field: 'sentiment' }
  if (/author|作者/.test(kl)) return { target: inOpinions ? 'opinion' : 'event', field: inOpinions ? 'author' : 'sourceAuthor' }
  if (/role|角色/.test(kl)) return { target: inOpinions ? 'opinion' : 'event', field: 'role' }
  if (/platform|平台/.test(kl)) return { target: 'opinion', field: 'platform' }
  if (/spread|传播/.test(kl)) return { target: 'event', field: 'spreadCount' }
  if (/material|素材/.test(kl)) return { target: 'material', field: 'type' }
  if (inProject && PROJECT_FIELDS.includes(key)) return { target: 'ignore', field: key }
  if (inEvents && EVENT_FIELDS.includes(key)) return { target: 'event', field: key }
  if (inOpinions && OPINION_FIELDS.includes(key)) return { target: 'opinion', field: key }
  if (inMaterials && MATERIAL_FIELDS.includes(key)) return { target: 'material', field: key }
  if (inProject) return { target: 'ignore', field: null }
  if (inEvents) return { target: 'event', field: null }
  if (inOpinions) return { target: 'opinion', field: null }
  if (inMaterials) return { target: 'material', field: null }
  return { target: 'ignore', field: null }
}

const extractFields = (obj: any, path: string[] = []): ImportFieldPreview[] => {
  const fields: ImportFieldPreview[] = []
  if (!obj || typeof obj !== 'object') return fields
  if (Array.isArray(obj)) { obj.slice(0, 1).forEach(item => extractFields(item, path).forEach(f => fields.push(f))); return fields }
  for (const [key, value] of Object.entries(obj)) {
    const fp = [...path, key]
    if (value && typeof value === 'object') { extractFields(value, fp).forEach(f => fields.push(f)); continue }
    const { target, field } = matchField(key, fp)
    fields.push({ sourceKey: fp.join('.'), sampleValue: value != null ? String(value).slice(0, 50) : '', suggestedTarget: target, matchedField: field, userTarget: target, userField: field })
  }
  return fields
}

const getVal = (obj: any, p: string): any => p.split('.').reduce((acc, k) => acc?.[k], obj)
const sProj = (r: any): Project | null => { if (!r || typeof r !== 'object') return null; const { id, name, scenicSpot, activityType, startDate, endDate, status, heatIndex, tags } = r; if (!name) return null; return { id: id || `proj-${Date.now()}`, name: String(name), scenicSpot: scenicSpot ? String(scenicSpot) : '', activityType: ACTIVITY_TYPES.includes(activityType) ? activityType : '其他', startDate: startDate ? String(startDate) : '', endDate: endDate ? String(endDate) : '', status: status === 'completed' ? 'completed' : 'analyzing', heatIndex: typeof heatIndex === 'number' ? heatIndex : 0, tags: Array.isArray(tags) ? tags.map(String) : [] } }
const sEv = (r: any, pid: string, i: number): TimelineEvent | null => !r || typeof r !== 'object' ? null : { id: r.id || `evt-${Date.now()}-${i}`, projectId: pid, timestamp: r.timestamp ? String(r.timestamp) : '', title: r.title ? String(r.title) : '', content: r.content ? String(r.content) : '', nodeType: NODE_TYPES.includes(r.nodeType) ? r.nodeType : 'origin', sentiment: SENTIMENTS.includes(r.sentiment) ? r.sentiment : 'neutral', spreadCount: typeof r.spreadCount === 'number' ? r.spreadCount : 500, sourceType: r.sourceType ? String(r.sourceType) : '', sourceAuthor: r.sourceAuthor ? String(r.sourceAuthor) : '', role: ROLE_TYPES.includes(r.role) ? r.role : 'tourist' }
const sOp = (r: any, pid: string, i: number): OpinionItem | null => !r || typeof r !== 'object' ? null : { id: r.id || `opi-${Date.now()}-${i}`, projectId: pid, eventId: r.eventId ? String(r.eventId) : '', role: ROLE_TYPES.includes(r.role) ? r.role : 'tourist', content: r.content ? String(r.content) : '', author: r.author ? String(r.author) : '', platform: r.platform ? String(r.platform) : '', sentiment: SENTIMENTS.includes(r.sentiment) ? r.sentiment : 'neutral', confirmed: r.confirmed === true }
const sMa = (r: any, pid: string, i: number): ReportMaterial | null => !r || typeof r !== 'object' ? null : { id: r.id || `mat-${Date.now()}-${i}`, projectId: pid, type: MATERIAL_TYPES.includes(r.type) ? r.type : 'typical_post', title: r.title ? String(r.title) : '', content: r.content ? String(r.content) : '', sourceEventId: r.sourceEventId ? String(r.sourceEventId) : '', sortOrder: typeof r.sortOrder === 'number' ? r.sortOrder : i, selected: r.selected !== false }

export default function ProjectList() {
  const nav = useNavigate()
  const { projects, selectedFilters, setSelectedFilters, addProject, importProject, resetStore, importPreview, setImportPreview, updateFieldMapping } = useStore()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showImp, setShowImp] = useState(false)
  const [form, setForm] = useState({ name: '', scenicSpot: '', activityType: '黄金周' as typeof ACTIVITY_TYPES[number], startDate: '', endDate: '' })
  const [tab, setTab] = useState<'paste' | 'file' | 'form'>('paste')
  const [pt, setPt] = useState('')
  const [ptErr, setPtErr] = useState('')
  const [fn, setFn] = useState('')
  const [fc, setFc] = useState('')
  const [fErr, setFErr] = useState('')
  const [iErr, setIErr] = useState('')
  const fir = useRef<HTMLInputElement>(null)
  const [fp, setFp] = useState({ name: '', scenicSpot: '', activityType: '黄金周' as typeof ACTIVITY_TYPES[number], startDate: '', endDate: '' })
  const [ers, setErs] = useState<ER[]>(Array.from({ length: 5 }, eER))
  const [ors, setOrs] = useState<OR[]>(Array.from({ length: 5 }, eOR))
  const [mrs, setMrs] = useState<MR[]>(Array.from({ length: 3 }, eMR))

  const filtered = projects.filter(p => (selectedFilters.status === 'all' || p.status === selectedFilters.status) && (!search || p.name.includes(search) || p.scenicSpot.includes(search))).sort((a, b) => selectedFilters.sortBy === 'heat' ? b.heatIndex - a.heatIndex : +new Date(b.startDate) - +new Date(a.startDate))
  const handleCreate = () => { const id = `proj-${Date.now()}`; addProject({ id, ...form, status: 'analyzing', heatIndex: 0, tags: [form.activityType, form.scenicSpot] }); setShowModal(false); setForm({ name: '', scenicSpot: '', activityType: '黄金周', startDate: '', endDate: '' }); nav(`/project/${id}`) }

  const proc = (raw: any) => {
    const project = sProj(raw?.project); if (!project) return null
    const pid = project.id, events: TimelineEvent[] = [], opinions: OpinionItem[] = [], materials: ReportMaterial[] = []
    if (Array.isArray(raw?.events)) raw.events.forEach((e: any, i: number) => { const ev = sEv(e, pid, i); if (ev) events.push(ev) })
    if (Array.isArray(raw?.opinions)) raw.opinions.forEach((o: any, i: number) => { const op = sOp(o, pid, i); if (op) opinions.push(op) })
    if (Array.isArray(raw?.materials)) raw.materials.forEach((m: any, i: number) => { const ma = sMa(m, pid, i); if (ma) materials.push(ma) })
    return { project, events, opinions, materials }
  }
  const rst = () => { setTab('paste'); setPt(''); setPtErr(''); setFn(''); setFc(''); setFErr(''); setIErr(''); setFp({ name: '', scenicSpot: '', activityType: '黄金周', startDate: '', endDate: '' }); setErs(Array.from({ length: 5 }, eER)); setOrs(Array.from({ length: 5 }, eOR)); setMrs(Array.from({ length: 3 }, eMR)); setImportPreview(null) }
  const doImp = (payload: any) => { const id = importProject(payload); setShowImp(false); rst(); nav(`/project/${id}`) }
  const buildPreview = (raw: any): ImportPreviewData | null => {
    if (!raw || typeof raw !== 'object') return null
    return {
      rawProject: raw.project || {},
      rawEvents: Array.isArray(raw.events) ? raw.events : [],
      rawOpinions: Array.isArray(raw.opinions) ? raw.opinions : [],
      rawMaterials: Array.isArray(raw.materials) ? raw.materials : [],
      fieldMappings: extractFields(raw),
    }
  }
  const hPaste = () => { setIErr(''); setPtErr(''); try { const raw = JSON.parse(pt); const p = buildPreview(raw); if (!p) { setPtErr('解析失败：无效的 JSON 数据'); return } setImportPreview(p) } catch (e: any) { setPtErr(e?.message || 'JSON 格式错误') } }
  const readF = (f: File) => { setFn(f.name); setFErr(''); setIErr(''); const rd = new FileReader(); rd.onload = () => setFc(String(rd.result || '')); rd.onerror = () => setFErr('文件读取失败'); rd.readAsText(f) }
  const hFC = (e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) readF(f) }
  const hDrop = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) readF(f) }
  const hFile = () => { setIErr(''); setFErr(''); try { const raw = JSON.parse(fc); const p = buildPreview(raw); if (!p) { setFErr('解析失败：无效的 JSON 数据'); return } setImportPreview(p) } catch (e: any) { setFErr(e?.message || 'JSON 格式错误') } }
  const remap = () => { if (!importPreview) return; const p = buildPreview({ project: importPreview.rawProject, events: importPreview.rawEvents, opinions: importPreview.rawOpinions, materials: importPreview.rawMaterials }); if (p) setImportPreview(p) }
  const cancelPreview = () => setImportPreview(null)

  const canConfirm = useMemo(() => {
    if (!importPreview) return false
    const hasName = importPreview.fieldMappings.some(m => (m.userTarget === 'ignore' && m.userField === 'name') || (m.sourceKey === 'project.name' && m.userField))
    return hasName || !!importPreview.rawProject?.name
  }, [importPreview])

  const confirmImport = () => {
    if (!importPreview || !canConfirm) return
    const { rawProject, rawEvents, rawOpinions, rawMaterials, fieldMappings } = importPreview
    const pd: any = { ...rawProject }, ed: any[] = rawEvents.length ? rawEvents.map(e => ({ ...e })) : [{}], od: any[] = rawOpinions.length ? rawOpinions.map(o => ({ ...o })) : [{}], md: any[] = rawMaterials.length ? rawMaterials.map(m => ({ ...m })) : [{}]
    const root = { project: rawProject, events: rawEvents, opinions: rawOpinions, materials: rawMaterials }
    fieldMappings.forEach(m => {
      if (m.userField === null) return
      const v = getVal(root, m.sourceKey); if (v == null) return
      const parts = m.sourceKey.split('.'), isArr = parts.some(p => !isNaN(Number(p)))
      const arrIdx = isArr ? parseInt(parts.find(p => !isNaN(Number(p))) || '0') : 0
      if (m.userTarget === 'ignore') pd[m.userField!] = v
      else if (m.userTarget === 'event') isArr && ed[arrIdx] ? ed[arrIdx][m.userField!] = v : ed.forEach(e => e[m.userField!] = v)
      else if (m.userTarget === 'opinion') isArr && od[arrIdx] ? od[arrIdx][m.userField!] = v : od.forEach(o => o[m.userField!] = v)
      else if (m.userTarget === 'material') isArr && md[arrIdx] ? md[arrIdx][m.userField!] = v : md.forEach(m => m[m.userField!] = v)
    })
    const pid = `proj-${Date.now()}`
    const project = sProj({ ...pd, id: pid }); if (!project) { setIErr('缺少有效的项目名称'); return }
    const events: TimelineEvent[] = [], opinions: OpinionItem[] = [], materials: ReportMaterial[] = []
    ed.forEach((e, i) => { if (e.title || e.content || e.timestamp) { const ev = sEv(e, pid, i); if (ev) events.push(ev) } })
    od.forEach((o, i) => { if (o.content) { const op = sOp(o, pid, i); if (op) opinions.push(op) } })
    md.forEach((m, i) => { if (m.title || m.content) { const ma = sMa(m, pid, i); if (ma) materials.push(ma) } })
    doImp({ project, events, opinions, materials })
  }

  const previewCounts = useMemo(() => {
    if (!importPreview) return { project: 0, events: 0, opinions: 0, materials: 0 }
    return {
      project: importPreview.fieldMappings.filter(m => m.userTarget === 'ignore' && m.userField).length,
      events: importPreview.fieldMappings.filter(m => m.userTarget === 'event').length,
      opinions: importPreview.fieldMappings.filter(m => m.userTarget === 'opinion').length,
      materials: importPreview.fieldMappings.filter(m => m.userTarget === 'material').length
    }
  }, [importPreview])

  const hForm = () => {
    setIErr(''); if (!fp.name.trim()) { setIErr('请填写项目名称'); return }
    const pid = `proj-${Date.now()}`
    const project: Project = { id: pid, name: fp.name, scenicSpot: fp.scenicSpot, activityType: fp.activityType, startDate: fp.startDate, endDate: fp.endDate, status: 'analyzing', heatIndex: 0, tags: [fp.activityType, fp.scenicSpot].filter(Boolean) }
    const events = ers.filter(r => r.title || r.content).map((r, i) => ({ id: `evt-${Date.now()}-${i}`, projectId: pid, timestamp: r.timestamp, title: r.title, content: r.content, nodeType: r.nodeType, sentiment: r.sentiment, spreadCount: r.spreadCount, sourceType: '', sourceAuthor: r.sourceAuthor, role: r.role }))
    const opinions = ors.filter(r => r.content).map((r, i) => ({ id: `opi-${Date.now()}-${i}`, projectId: pid, eventId: '', role: r.role, content: r.content, author: r.author, platform: r.platform, sentiment: r.sentiment, confirmed: false }))
    const materials = mrs.filter(r => r.title || r.content).map((r, i) => ({ id: `mat-${Date.now()}-${i}`, projectId: pid, type: r.type, title: r.title, content: r.content, sourceEventId: '', sortOrder: i, selected: true }))
    doImp({ project, events, opinions, materials })
  }

  return (
    <div className="min-h-screen bg-dark-900 pb-20">
      <header className="border-b border-dark-600 bg-dark-800/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3"><FolderOpen className="w-6 h-6 text-accent" /><div><h1 className="text-lg font-bold text-dark-100">舆情研判工作台</h1><p className="text-xs text-dark-300">文旅集团深度复盘工具</p></div></div>
          <div className="flex items-center gap-3">
            <button onClick={() => { rst(); setShowImp(true) }} className="flex items-center gap-2 px-4 py-2 bg-dark-700 hover:bg-dark-600 text-dark-100 font-medium rounded-lg transition-colors border border-dark-600"><Upload className="w-4 h-4" />导入数据</button>
            <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-dim text-dark-900 font-medium rounded-lg transition-colors"><Plus className="w-4 h-4" />新建项目</button>
          </div>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-6 py-5">
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="flex items-center gap-1 bg-dark-800 rounded-full p-1 border border-dark-600">
            {STATUS_OPTIONS.map(o => (<button key={o.key} onClick={() => setSelectedFilters({ status: o.key })} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedFilters.status === o.key ? 'bg-accent text-dark-900' : 'text-dark-300 hover:text-dark-100'}`}>{o.label}</button>))}
          </div>
          <div className="flex items-center gap-1 bg-dark-800 rounded-full p-1 border border-dark-600">
            {SORT_OPTIONS.map(o => (<button key={o.key} onClick={() => setSelectedFilters({ sortBy: o.key })} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedFilters.sortBy === o.key ? 'bg-dark-700 text-accent' : 'text-dark-300 hover:text-dark-100'}`}>{o.label}</button>))}
          </div>
          <div className="relative ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索项目名称或景区..." className="pl-9 pr-4 py-2 bg-dark-800 border border-dark-600 rounded-lg text-sm text-dark-100 placeholder:text-dark-400 focus:outline-none focus:border-accent transition-colors w-64" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-dark-400 hover:text-dark-200" /></button>}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((p, i) => (
            <div key={p.id} onClick={() => nav(`/project/${p.id}`)} className="animate-fade-in-up glow-accent-hover group relative flex bg-dark-800 border border-dark-600 rounded-xl overflow-hidden cursor-pointer hover:border-accent/50 transition-all" style={{ animationDelay: `${i * 60}ms` }}>
              <div className={`w-1 shrink-0 ${p.status === 'completed' ? 'bg-success' : 'bg-ferment'}`} />
              <div className="flex-1 p-5 min-w-0">
                <h3 className="font-bold text-lg text-dark-100 mb-2 truncate group-hover:text-accent transition-colors">{p.name}</h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-dark-300 mb-3">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{p.scenicSpot}</span>
                  <span className="px-2 py-0.5 bg-dark-700 text-dark-200 rounded text-xs">{p.activityType}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{p.startDate} ~ {p.endDate}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`flex items-center gap-1 text-sm font-semibold ${getHeatColor(p.heatIndex)}`}><Flame className="w-4 h-4" />{p.heatIndex}</span>
                    <div className="flex items-center gap-1.5"><Tag className="w-3 h-3 text-dark-400" />{p.tags.slice(0, 3).map(t => <span key={t} className="px-1.5 py-0.5 bg-dark-700 text-dark-300 rounded text-xs">{t}</span>)}</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-dark-500 group-hover:text-accent transition-colors" />
                </div>
              </div>
            </div>
          ))}
        </div>
        {filtered.length === 0 && <div className="text-center py-20 text-dark-400"><Filter className="w-10 h-10 mx-auto mb-3 opacity-50" /><p>暂无匹配的项目</p></div>}
      </div>
      <button onClick={() => { if (confirm('确定要清空所有数据并恢复到初始状态吗？')) resetStore() }} className="fixed bottom-4 right-4 text-xs text-dark-500 hover:text-breakout transition-colors z-20">清空所有数据</button>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="glass-panel rounded-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5"><h2 className="text-lg font-bold text-dark-100">新建项目</h2><button onClick={() => setShowModal(false)} className="text-dark-400 hover:text-dark-200 transition-colors"><X className="w-5 h-5" /></button></div>
            <div className="space-y-4">
              <div><label className="block text-sm text-dark-300 mb-1">项目名称</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-sm text-dark-100 focus:outline-none focus:border-accent" /></div>
              <div><label className="block text-sm text-dark-300 mb-1">景区名称</label><input value={form.scenicSpot} onChange={e => setForm({ ...form, scenicSpot: e.target.value })} className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-sm text-dark-100 focus:outline-none focus:border-accent" /></div>
              <div><label className="block text-sm text-dark-300 mb-1">活动类型</label><select value={form.activityType} onChange={e => setForm({ ...form, activityType: e.target.value as typeof ACTIVITY_TYPES[number] })} className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-sm text-dark-100 focus:outline-none focus:border-accent">{ACTIVITY_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm text-dark-300 mb-1">开始日期</label><input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-sm text-dark-100 focus:outline-none focus:border-accent" /></div>
                <div><label className="block text-sm text-dark-300 mb-1">结束日期</label><input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-sm text-dark-100 focus:outline-none focus:border-accent" /></div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-dark-300 hover:text-dark-100 transition-colors">取消</button>
              <button onClick={handleCreate} disabled={!form.name || !form.scenicSpot || !form.startDate || !form.endDate} className="px-4 py-2 text-sm bg-accent hover:bg-accent-dim text-dark-900 font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">创建并进入</button>
            </div>
          </div>
        </div>
      )}
      {showImp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowImp(false)}>
          <div className="glass-panel rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-dark-600"><h2 className="text-lg font-bold text-dark-100">导入数据</h2><button onClick={() => setShowImp(false)} className="text-dark-400 hover:text-dark-200 transition-colors"><X className="w-5 h-5" /></button></div>
            <div className="px-6 pt-4 border-b border-dark-600">
              <div className="flex items-center gap-6">
                {(['paste', 'file', 'form'] as const).map(t => (<button key={t} onClick={() => { setTab(t); setImportPreview(null) }} className={`pb-3 text-sm font-medium transition-colors border-b-2 ${tab === t ? 'text-accent border-accent' : 'text-dark-400 border-transparent hover:text-dark-200'}`}>{t === 'paste' ? '粘贴 JSON' : t === 'file' ? '上传文件' : '表单批量录入'}</button>))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {iErr && !importPreview && <div className="mb-4 p-3 rounded-lg bg-breakout/15 border border-breakout text-breakout text-sm">{iErr}</div>}
              {tab === 'paste' && !importPreview && (<div className="space-y-3"><textarea value={pt} onChange={e => { setPt(e.target.value); setPtErr('') }} placeholder={SAMPLE_JSON} rows={12} className={`w-full px-3 py-2 bg-dark-700 border rounded-lg text-sm text-dark-100 placeholder:text-dark-500 focus:outline-none transition-colors font-mono resize-none ${ptErr ? 'border-breakout focus:border-breakout' : 'border-dark-600 focus:border-accent'}`} />{ptErr && <p className="text-sm text-breakout">{ptErr}</p>}</div>)}
              {tab === 'file' && !importPreview && (
                <div className="space-y-3">
                  <input ref={fir} type="file" accept=".json,.txt" onChange={hFC} className="hidden" />
                  <div onClick={() => fir.current?.click()} onDrop={hDrop} onDragOver={e => e.preventDefault()} className="border-2 border-dashed border-dark-600 hover:border-accent rounded-xl p-8 text-center cursor-pointer transition-colors"><Upload className="w-10 h-10 text-dark-400 mx-auto mb-3" /><p className="text-sm text-dark-300 mb-1">点击或拖拽文件到此处</p><p className="text-xs text-dark-500">支持 .json / .txt 格式</p></div>
                  {fn && (<div className={`p-3 rounded-lg border ${fErr ? 'bg-breakout/10 border-breakout' : 'bg-dark-700 border-dark-600'}`}><p className="text-sm text-dark-200">已选择：{fn}</p>{fc && <p className="text-xs text-dark-400 mt-1 truncate">预览：{fc.slice(0, 120)}...</p>}{fErr && <p className="text-sm text-breakout mt-1">{fErr}</p>}</div>)}
                </div>
              )}
              {importPreview && (tab === 'paste' || tab === 'file') && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-dark-100">字段匹配预览</h3><button onClick={remap} className="flex items-center gap-1 text-xs text-accent hover:text-accent-dim transition-colors"><RefreshCw className="w-3 h-3" />自动匹配</button></div>
                  <div className="grid grid-cols-4 gap-4 text-xs text-dark-400 pb-2 border-b border-dark-600"><div>项目信息 ({previewCounts.project}字段)</div><div>时间线 ({previewCounts.events}条)</div><div>观点 ({previewCounts.opinions}条)</div><div>素材 ({previewCounts.materials}条)</div></div>
                  <div className="max-h-64 overflow-y-auto space-y-0.5">
                    {importPreview.fieldMappings.map((field, idx) => (
                      <div key={idx} className={`grid grid-cols-12 gap-2 p-2 items-center text-xs ${idx % 2 === 0 ? 'bg-dark-800' : 'bg-dark-700/50'}`}>
                        <div className="col-span-3 font-mono text-dark-200 truncate" title={field.sourceKey}>{field.sourceKey}</div>
                        <div className="col-span-2 text-dark-400 truncate" title={field.sampleValue}>{field.sampleValue || '-'}</div>
                        <div className="col-span-3">
                          <select value={field.userTarget} onChange={e => updateFieldMapping(field.sourceKey, { userTarget: e.target.value as ImportTargetType })} className={`w-full px-2 py-1 bg-dark-700 border border-dark-600 rounded text-xs text-dark-100 focus:outline-none focus:border-accent ${field.userTarget !== field.suggestedTarget ? '' : 'ring-1 ring-accent/30'}`}>
                            {(['ignore', 'event', 'opinion', 'material'] as ImportTargetType[]).map(t => (<option key={t} value={t}>{t === 'ignore' ? '项目字段' : IMPORT_TARGET_LABELS[t]}</option>))}
                          </select>
                        </div>
                        <div className="col-span-4 flex items-center gap-1">
                          {field.sourceKey === 'project.name' && field.userTarget === 'ignore' && <span className="text-breakout">*</span>}
                          <select value={field.userField || ''} onChange={e => updateFieldMapping(field.sourceKey, { userField: e.target.value || null })} className="flex-1 px-2 py-1 bg-dark-700 border border-dark-600 rounded text-xs text-dark-100 focus:outline-none focus:border-accent">
                            <option value="">忽略</option>
                            {FIELD_OPTS[field.userTarget].map(f => <option key={f} value={f}>{f}</option>)}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {tab === 'form' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs text-dark-400 mb-1">项目名称 *</label><input value={fp.name} onChange={e => setFp({ ...fp, name: e.target.value })} className="w-full px-2.5 py-1.5 bg-dark-700 border border-dark-600 rounded text-sm text-dark-100 focus:outline-none focus:border-accent" /></div>
                    <div><label className="block text-xs text-dark-400 mb-1">景区名称</label><input value={fp.scenicSpot} onChange={e => setFp({ ...fp, scenicSpot: e.target.value })} className="w-full px-2.5 py-1.5 bg-dark-700 border border-dark-600 rounded text-sm text-dark-100 focus:outline-none focus:border-accent" /></div>
                    <div><label className="block text-xs text-dark-400 mb-1">活动类型</label><select value={fp.activityType} onChange={e => setFp({ ...fp, activityType: e.target.value as typeof ACTIVITY_TYPES[number] })} className="w-full px-2.5 py-1.5 bg-dark-700 border border-dark-600 rounded text-sm text-dark-100 focus:outline-none focus:border-accent">{ACTIVITY_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                    <div className="grid grid-cols-2 gap-2"><div><label className="block text-xs text-dark-400 mb-1">开始</label><input type="date" value={fp.startDate} onChange={e => setFp({ ...fp, startDate: e.target.value })} className="w-full px-2.5 py-1.5 bg-dark-700 border border-dark-600 rounded text-sm text-dark-100 focus:outline-none focus:border-accent" /></div><div><label className="block text-xs text-dark-400 mb-1">结束</label><input type="date" value={fp.endDate} onChange={e => setFp({ ...fp, endDate: e.target.value })} className="w-full px-2.5 py-1.5 bg-dark-700 border border-dark-600 rounded text-sm text-dark-100 focus:outline-none focus:border-accent" /></div></div>
                  </div>
                  {([{ title: '时间线节点', rows: ers, setRows: setErs, mk: eER, cols: [{ k: 'timestamp', t: 'datetime-local', p: '时间', c: 2 }, { k: 'title', t: 'text', p: '标题', c: 2 }, { k: 'content', t: 'text', p: '内容', c: 3 }, { k: 'nodeType', t: 'select', opts: NODE_TYPES.map(v => ({ v, l: NL[v] })), c: 1 }, { k: 'sentiment', t: 'select', opts: SENTIMENTS.map(v => ({ v, l: SL[v] })), c: 1 }, { k: 'spreadCount', t: 'number', p: '传播量', c: 1 }, { k: 'sourceAuthor', t: 'text', p: '作者', c: 1 }, { k: 'role', t: 'select', opts: ROLE_TYPES.map(v => ({ v, l: RL[v] })), c: 1 }], mh: 'max-h-64' }, { title: '观点', rows: ors, setRows: setOrs, mk: eOR, cols: [{ k: 'role', t: 'select', opts: ROLE_TYPES.map(v => ({ v, l: RL[v] })), c: 2 }, { k: 'content', t: 'text', p: '内容', c: 5 }, { k: 'author', t: 'text', p: '作者', c: 2 }, { k: 'platform', t: 'text', p: '平台', c: 2 }, { k: 'sentiment', t: 'select', opts: SENTIMENTS.map(v => ({ v, l: SL[v] })), c: 1 }], mh: 'max-h-56' }, { title: '复盘素材', rows: mrs, setRows: setMrs, mk: eMR, cols: [{ k: 'type', t: 'select', opts: MATERIAL_TYPES.map(v => ({ v, l: ML[v] })), c: 2 }, { k: 'title', t: 'text', p: '标题', c: 3 }, { k: 'content', t: 'text', p: '内容', c: 6 }], mh: 'max-h-48' }] as any[]).map((sec: any, si: number) => (
                    <div key={si}>
                      <div className="flex items-center justify-between mb-2"><h3 className="text-sm font-semibold text-dark-200">{sec.title}</h3><button onClick={() => sec.setRows([...sec.rows, sec.mk()])} className="text-xs text-accent hover:text-accent-dim flex items-center gap-0.5"><Plus className="w-3 h-3" />添加行</button></div>
                      <div className={`${sec.mh} overflow-y-auto border border-dark-600 rounded-lg divide-y divide-dark-600`}>
                        {sec.rows.map((row: any, i: number) => (
                          <div key={i} className="p-2 grid grid-cols-12 gap-1.5 items-center">
                            {sec.cols.map((col: any, ci: number) => {
                              const onChange = (e: any) => { const val = col.t === 'number' ? Number(e.target.value) : e.target.value; sec.setRows(sec.rows.map((r: any, j: number) => (j === i ? { ...r, [col.k]: val } : r))) }
                              return col.t === 'select' ? (<select key={ci} value={row[col.k]} onChange={onChange} className={`${inputCls} col-span-${col.c} px-1`}>{col.opts.map((o: any) => <option key={o.v} value={o.v}>{o.l}</option>)}</select>) : (<input key={ci} type={col.t} placeholder={col.p} value={row[col.k]} onChange={onChange} className={`${inputCls} col-span-${col.c}`} />)
                            })}
                            {sec.rows.length > 1 && (<button onClick={() => sec.setRows(sec.rows.filter((_: any, j: number) => j !== i))} className="col-span-0 p-1 text-dark-500 hover:text-breakout transition-colors"><Minus className="w-3 h-3" /></button>)}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-dark-600">
              {importPreview && (tab === 'paste' || tab === 'file') ? (
                <><button onClick={cancelPreview} className="px-4 py-2 text-sm text-dark-300 hover:text-dark-100 transition-colors">取消</button><button onClick={confirmImport} disabled={!canConfirm} className="px-6 py-2 text-sm bg-accent hover:bg-accent-dim text-dark-900 font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">确认导入</button></>
              ) : (
                <><button onClick={() => setShowImp(false)} className="px-4 py-2 text-sm text-dark-300 hover:text-dark-100 transition-colors">取消</button>{tab === 'paste' && <button onClick={hPaste} disabled={!pt.trim()} className="px-4 py-2 text-sm bg-accent hover:bg-accent-dim text-dark-900 font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">解析并预览</button>}{tab === 'file' && <button onClick={hFile} disabled={!fc.trim()} className="px-4 py-2 text-sm bg-accent hover:bg-accent-dim text-dark-900 font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">解析并预览</button>}{tab === 'form' && <button onClick={hForm} className="px-4 py-2 text-sm bg-accent hover:bg-accent-dim text-dark-900 font-medium rounded-lg transition-colors">导入并进入</button>}</>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
