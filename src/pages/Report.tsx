import { useStore } from '@/store/useStore'
import { useParams, useNavigate } from 'react-router-dom'
import { useState, useMemo, useEffect } from 'react'
import {
  ArrowLeft, FileText, CheckSquare, Square, Image,
  MessageSquare, Shield, Lightbulb, Download, Printer,
  ChevronUp, ChevronDown,
} from 'lucide-react'
import type { ReportMaterial, MaterialType, Project, TimelineEvent, OpinionItem, RoleType } from '@/types'
import { MATERIAL_TYPE_LABELS, ROLE_LABELS } from '@/types'

const TYPE_COLORS: Record<MaterialType, string> = {
  typical_post: 'bg-accent/20 text-accent',
  spread_screenshot: 'bg-ferment/20 text-ferment',
  action_taken: 'bg-success/20 text-success',
  conclusion: 'bg-cooldown/20 text-cooldown',
}
const TYPE_ICONS: Record<MaterialType, typeof MessageSquare> = {
  typical_post: MessageSquare, spread_screenshot: Image,
  action_taken: Shield, conclusion: Lightbulb,
}
const TYPE_BORDER: Record<MaterialType, string> = {
  typical_post: 'border-accent/50', spread_screenshot: 'border-ferment/50',
  action_taken: 'border-success/50', conclusion: 'border-cooldown/50',
}
const NUMERALS = ['一', '二', '三', '四', '五']

function fmtShort(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}
function fmtFull(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}
function buildSummary(p: Project, evts: TimelineEvent[]): string {
  const total = evts.length, brk = evts.filter(e=>e.nodeType==='breakout').length
  const ref = evts.filter(e=>e.nodeType==='re_ferment').length, off = evts.filter(e=>e.nodeType==='official_response').length
  const neg = evts.filter(e=>e.sentiment==='negative').length, pos = evts.filter(e=>e.sentiment==='positive').length
  const rc: Record<string,number> = {}
  evts.forEach(e => { rc[e.role] = (rc[e.role]??0)+1 })
  const top = Object.entries(rc).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([r])=>ROLE_LABELS[r as RoleType])
  const sent = neg>pos?'负面为主':pos>neg?'正面为主':'正负相当'
  return `${p.name}（${p.startDate}至${p.endDate}）共产生${total}条舆情事件，其中爆点${brk}个，二次发酵${ref}个，官方回应${off}次。整体舆情以${sent}，主要涉及角色包括${top.length?top.join('、'):'多方'}等群体。`
}
function buildOpBullets(opinions: OpinionItem[]): string[] {
  const br: Record<string, OpinionItem[]> = {}
  opinions.forEach(o => { if(!br[o.role]) br[o.role]=[]; br[o.role].push(o) })
  const out: string[] = []
  Object.entries(br).forEach(([role, items]) => {
    const t = items.length, p = items.filter(o=>o.sentiment==='positive').length, n = items.filter(o=>o.sentiment==='negative').length
    const pp = t?Math.round(p/t*100):0, np = t?Math.round(n/t*100):0
    out.push(`${ROLE_LABELS[role as RoleType]}${t}条，其中正面${p}条(${pp}%)、负面${n}条(${np}%)，涉及相关讨论与反馈。`)
  })
  return out
}
function buildExport(p: Project, sel: ReportMaterial[], evts: TimelineEvent[], ops: OpinionItem[], gen: boolean, at: string|null): string {
  const g: Record<MaterialType, ReportMaterial[]> = { typical_post:[], spread_screenshot:[], action_taken:[], conclusion:[] }
  sel.forEach(m => g[m.type].push(m))
  const L: string[] = [], evo = [...g.typical_post, ...g.spread_screenshot]
  L.push(`${p.name}\n`); L.push('一、事件概述'); L.push(buildSummary(p, evts)); L.push('')
  L.push('二、舆情演化过程')
  if(evo.length) evo.forEach(m => L.push(`- ${gen?`${m.title}：${m.content}`:m.title}`))
  else L.push('（暂无素材）')
  L.push(''); L.push('三、各方观点')
  const ob = buildOpBullets(ops)
  if(ob.length) ob.forEach(b => L.push(`- ${b}`))
  else L.push('（暂无观点数据）')
  L.push(''); L.push('四、处置评估')
  if(g.action_taken.length) g.action_taken.forEach(m => L.push(`- ${gen?`${m.title}：${m.content}`:m.title}`))
  else L.push('（暂无素材）')
  L.push(''); L.push('五、改进建议')
  if(g.conclusion.length) g.conclusion.forEach(m => L.push(`- ${gen?`${m.title}：${m.content}`:m.title}`))
  else L.push('（暂无素材）')
  L.push(''); const ts = at ?? new Date().toISOString()
  L.push('---'); L.push(`生成时间：${fmtFull(ts)}`)
  return L.join('\n')
}

export default function Report() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const [isGen, setIsGen] = useState(false)
  const [genAt, setGenAt] = useState<string|null>(null)
  const [toast, setToast] = useState<string|null>(null)

  const projects = useStore(s=>s.projects)
  const rms = useStore(s=>s.reportMaterials)
  const tes = useStore(s=>s.timelineEvents)
  const ois = useStore(s=>s.opinionItems)
  const togSel = useStore(s=>s.toggleMaterialSelection)
  const swap = useStore(s=>s.swapMaterialOrder)
  const mark = useStore(s=>s.markReportGenerated)

  const project = useMemo(()=>projects.find(p=>p.id===id), [projects, id])
  const materials = useMemo(()=>rms.filter(m=>m.projectId===id).sort((a,b)=>a.sortOrder-b.sortOrder), [rms, id])
  const events = useMemo(()=>tes.filter(e=>e.projectId===id), [tes, id])
  const opinions = useMemo(()=>ois.filter(o=>o.projectId===id), [ois, id])
  const sel = useMemo(()=>materials.filter(m=>m.selected), [materials])
  const gs = useMemo(()=>{
    const r: Record<MaterialType, ReportMaterial[]> = { typical_post:[], spread_screenshot:[], action_taken:[], conclusion:[] }
    sel.forEach(m => r[m.type].push(m))
    return r
  }, [sel])
  const esum = useMemo(()=>(project?buildSummary(project, events):''), [project, events])
  const ob = useMemo(()=>buildOpBullets(opinions), [opinions])

  useEffect(()=>{ if(!toast) return; const t=setTimeout(()=>setToast(null),2000); return ()=>clearTimeout(t) }, [toast])

  const onGen = () => { mark(); const ts = new Date().toISOString(); setIsGen(true); setGenAt(ts) }
  const onReset = () => { setIsGen(false); setGenAt(null) }
  const needEdit = () => { setToast('请点击重新编辑以修改素材') }
  const onTog = (mid: string) => { if(isGen) { needEdit(); return } togSel(mid) }
  const onUp = (i: number) => { if(i<=0||isGen) { if(isGen) needEdit(); return } swap(materials[i].id, materials[i-1].id) }
  const onDn = (i: number) => { if(i>=materials.length-1||isGen) { if(isGen) needEdit(); return } swap(materials[i].id, materials[i+1].id) }
  const onExp = () => {
    if(!project) return
    const txt = buildExport(project, sel, events, opinions, isGen, genAt)
    const blob = new Blob([txt], { type:'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${project.name}.txt`; a.click()
    URL.revokeObjectURL(url)
  }

  const sects = useMemo(()=>[
    { t:'事件概述', mats:[] as ReportMaterial[], col:'border-accent', sum:esum, bulls:[] as string[] },
    { t:'舆情演化过程', mats:[...gs.typical_post, ...gs.spread_screenshot], col:'border-ferment', sum:null, bulls:[] as string[] },
    { t:'各方观点', mats:[] as ReportMaterial[], col:'border-dark-400', sum:null, bulls:ob },
    { t:'处置评估', mats:gs.action_taken, col:'border-success', sum:null, bulls:[] as string[] },
    { t:'改进建议', mats:gs.conclusion, col:'border-cooldown', sum:null, bulls:[] as string[] },
  ], [gs, esum, ob])

  if(!project) return <div className="flex h-screen items-center justify-center bg-dark-900 text-dark-300">项目不存在</div>

  return (
    <div className="flex h-screen flex-col bg-dark-900 text-dark-100">
      <header className="flex items-center gap-3 border-b border-dark-600 px-6 py-4">
        <button onClick={()=>nav(-1)} className="text-dark-300 hover:text-dark-100"><ArrowLeft size={20} /></button>
        <FileText size={20} className="text-accent" />
        <h1 className="text-lg font-semibold">{project.name} — 汇报输出</h1>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex w-[55%] flex-col border-r border-dark-600">
          <div className="px-6 pt-5 pb-3">
            <h2 className="text-base font-semibold">材料选择</h2>
            <p className="mt-0.5 text-sm text-dark-300">从时间线中选择典型素材</p>
          </div>
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <div className="space-y-3">
              {materials.map((mat, i) => {
                const Icon = TYPE_ICONS[mat.type]
                return (
                  <div key={mat.id} className={`flex items-start gap-3 rounded-lg border p-4 ${mat.selected?`${TYPE_BORDER[mat.type]} bg-dark-700/50`:'border-dark-600 bg-dark-800'}`}>
                    <button onClick={()=>onTog(mat.id)} className="mt-0.5 shrink-0">
                      {mat.selected?<CheckSquare size={18} className="text-accent"/>:<Square size={18} className="text-dark-400"/>}
                    </button>
                    <Icon size={18} className="mt-0.5 shrink-0 text-dark-400" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[mat.type]}`}>{MATERIAL_TYPE_LABELS[mat.type]}</span>
                        <span className="truncate font-medium">{mat.title}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-dark-300">{mat.content}</p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-0.5">
                      <button onClick={()=>onUp(i)} className="text-dark-400 hover:text-dark-100 disabled:opacity-30" disabled={i===0}><ChevronUp size={16}/></button>
                      <button onClick={()=>onDn(i)} className="text-dark-400 hover:text-dark-100 disabled:opacity-30" disabled={i===materials.length-1}><ChevronDown size={16}/></button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        <div className="flex w-[45%] flex-col">
          <div className="flex items-center justify-between px-6 pt-5 pb-3">
            <div>
              <div className="flex items-center gap-2">
                {isGen && <div className="h-2 w-2 rounded-full bg-success"/>}
                <h2 className="text-base font-semibold">{isGen?'正式汇报提纲':'提纲草稿'}</h2>
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-dark-400">
                {isGen && genAt?<span>生成于 {fmtShort(genAt)}</span>:<span>实时预览，选择素材后即时更新</span>}
              </div>
            </div>
            <div className="flex gap-2">
              {!isGen?(
                <button onClick={onGen} className="flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-dark-900 hover:bg-accent/90">一键生成</button>
              ):(
                <button onClick={onReset} className="flex items-center gap-1.5 rounded-md bg-dark-700 px-3 py-1.5 text-sm text-dark-200 hover:bg-dark-600">重新编辑</button>
              )}
              <button onClick={onExp} className="flex items-center gap-1.5 rounded-md bg-dark-700 px-3 py-1.5 text-sm text-dark-200 hover:bg-dark-600"><Download size={14}/>导出文本</button>
              <button onClick={()=>window.print()} className="flex items-center gap-1.5 rounded-md bg-dark-700 px-3 py-1.5 text-sm text-dark-200 hover:bg-dark-600"><Printer size={14}/>打印</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <div className="rounded-lg bg-dark-800 p-6">
              <h3 className="mb-6 text-center text-lg font-bold">{project.name}</h3>
              {sel.length===0 && !isGen?(
                <p className="py-8 text-center text-sm text-dark-400">请从左侧选择素材以生成汇报提纲</p>
              ):(
                <div className="space-y-5">
                  {sects.map((s, i) => (
                    <div key={i}>
                      <div className="flex items-stretch gap-3">
                        <div className={`w-1 shrink-0 rounded-full ${s.col}`}/>
                        <div className="flex-1">
                          <h4 className="font-bold">{NUMERALS[i]}、{s.t}</h4>
                          {s.sum?(
                            <p className="mt-2 text-sm text-dark-300 leading-relaxed">{s.sum}</p>
                          ):s.bulls.length>0?(
                            <ul className="mt-2 space-y-1.5">
                              {s.bulls.map((b,bi)=>(
                                <li key={bi} className="flex items-start gap-2 text-sm text-dark-300">
                                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-dark-400"/><span>{b}</span>
                                </li>
                              ))}
                            </ul>
                          ):s.mats.length>0?(
                            <ul className="mt-2 space-y-1.5">
                              {s.mats.map(m=>(
                                <li key={m.id} className="flex items-start gap-2 text-sm text-dark-300">
                                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-dark-400"/>
                                  <div>
                                    <span className="font-medium text-dark-200">{m.title}</span>
                                    {isGen && <p className="mt-1 text-xs leading-relaxed text-dark-400">{m.content}</p>}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          ):(
                            <p className="mt-2 text-sm text-dark-500">（暂无素材）</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {toast && (
        <div className="pointer-events-none fixed bottom-8 left-1/2 -translate-x-1/2 rounded-lg bg-dark-700 px-4 py-2 text-sm text-dark-100 shadow-lg border border-dark-600">{toast}</div>
      )}
    </div>
  )
}
