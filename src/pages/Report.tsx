import { useStore } from '@/store/useStore'
import { useParams, useNavigate } from 'react-router-dom'
import { useState, useMemo, useEffect, useRef } from 'react'
import {
  ArrowLeft, FileText, CheckSquare, Square, Image,
  MessageSquare, Shield, Lightbulb, Download, Printer,
  ChevronUp, ChevronDown, Lock, Edit2, History,
  ChevronRight, Trash2, Eye,
} from 'lucide-react'
import type { ReportMaterial, MaterialType, Project, TimelineEvent, OpinionItem, RoleType, ReportTemplateType, ReportTemplateSection, OpinionInsight, ReportDraft } from '@/types'
import { MATERIAL_TYPE_LABELS, ROLE_LABELS, REPORT_TEMPLATES, REPORT_TEMPLATE_LABELS } from '@/types'

const TC: Record<MaterialType, string> = {
  typical_post: 'bg-accent/20 text-accent', spread_screenshot: 'bg-ferment/20 text-ferment',
  action_taken: 'bg-success/20 text-success', conclusion: 'bg-cooldown/20 text-cooldown',
}
const TI: Record<MaterialType, typeof MessageSquare> = {
  typical_post: MessageSquare, spread_screenshot: Image, action_taken: Shield, conclusion: Lightbulb,
}
const TB: Record<MaterialType, string> = {
  typical_post: 'border-accent/50', spread_screenshot: 'border-ferment/50',
  action_taken: 'border-success/50', conclusion: 'border-cooldown/50',
}
const NN = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
const fmtS = (iso: string) => { const d = new Date(iso); return `${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` }
const fmtF = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` }
const buildSum = (p: Project, evts: TimelineEvent[]) => {
  const total = evts.length, brk = evts.filter(e=>e.nodeType==='breakout').length
  const ref = evts.filter(e=>e.nodeType==='re_ferment').length, off = evts.filter(e=>e.nodeType==='official_response').length
  const neg = evts.filter(e=>e.sentiment==='negative').length, pos = evts.filter(e=>e.sentiment==='positive').length
  const rc: Record<string,number> = {}; evts.forEach(e => { rc[e.role] = (rc[e.role]??0)+1 })
  const top = Object.entries(rc).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([r])=>ROLE_LABELS[r as RoleType])
  const sent = neg>pos?'负面为主':pos>neg?'正面为主':'正负相当'
  return `${p.name}（${p.startDate}至${p.endDate}）共产生${total}条舆情事件，其中爆点${brk}个，二次发酵${ref}个，官方回应${off}次。整体舆情以${sent}，主要涉及角色包括${top.length?top.join('、'):'多方'}等群体。`
}
const buildOB = (ops: OpinionItem[]) => {
  const br: Record<string, OpinionItem[]> = {}; ops.forEach(o => { if(!br[o.role]) br[o.role]=[]; br[o.role].push(o) })
  const out: string[] = []
  Object.entries(br).forEach(([role, items]) => {
    const t = items.length, p = items.filter(o=>o.sentiment==='positive').length, n = items.filter(o=>o.sentiment==='negative').length
    const pp = t?Math.round(p/t*100):0, np = t?Math.round(n/t*100):0
    out.push(`${ROLE_LABELS[role as RoleType]}${t}条，其中正面${p}条(${pp}%)、负面${n}条(${np}%)，涉及相关讨论与反馈。`)
  })
  return out
}
export default function Report() {
  const { id } = useParams<{ id: string }>(); const nav = useNavigate()
  const [isGen, setIsGen] = useState(false); const [genAt, setGenAt] = useState<string|null>(null)
  const [toast, setToast] = useState<string|null>(null); const [draftNotice, setDraftNotice] = useState(false)
  const [histOpen, setHistOpen] = useState(true); const [hoverId, setHoverId] = useState<string|null>(null)
  const [confirmDel, setConfirmDel] = useState<string|null>(null); const [tipVisible, setTipVisible] = useState(false)
  const toastTimer = useRef<number|null>(null)
  const rms = useStore(s=>s.reportMaterials); const tes = useStore(s=>s.timelineEvents); const ois = useStore(s=>s.opinionItems)
  const currentTemplate = useStore(s=>s.currentReportTemplate); const togSel = useStore(s=>s.toggleMaterialSelection)
  const setMatSel = useStore(s=>s.setMaterialSelected); const swap = useStore(s=>s.swapMaterialOrder)
  const mark = useStore(s=>s.markReportGenerated); const setTemplate = useStore(s=>s.setCurrentReportTemplate)
  const saveDraft = useStore(s=>s.saveReportDraft); const setDraftId = useStore(s=>s.setCurrentDraftId)
  const getDraftByProj = useStore(s=>s.getDraftByProject); const getProj = useStore(s=>s.getProjectById)
  const manualText = useStore(s=>s.manualAnalysisText); const setManual = useStore(s=>s.setManualAnalysis)
  const ins = useStore(s=>s.insertedInsights); const viewDraftId = useStore(s=>s.viewDraftId)
  const clearView = useStore(s=>s.clearViewDraft); const switchDraft = useStore(s=>s.switchToDraft)
  const delDraft = useStore(s=>s.deleteDraftById); const getDrafts = useStore(s=>s.getDraftsByProject)
  const reportDrafts = useStore(s=>s.reportDrafts)
  const project = useMemo(()=>getProj(id??''), [getProj, id])
  const materials = useMemo(()=>rms.filter(m=>m.projectId===id).sort((a,b)=>a.sortOrder-b.sortOrder), [rms, id])
  const events = useMemo(()=>tes.filter(e=>e.projectId===id), [tes, id])
  const opinions = useMemo(()=>ois.filter(o=>o.projectId===id), [ois, id])
  const sel = useMemo(()=>materials.filter(m=>m.selected), [materials])
  const template = useMemo(()=>currentTemplate, [currentTemplate])
  const sections = useMemo(()=>REPORT_TEMPLATES[template], [template])
  const drafts = useMemo(()=>id?getDrafts(id):[], [getDrafts, id, reportDrafts])
  const viewingDraft = useMemo(()=>viewDraftId?reportDrafts.find(d=>d.id===viewDraftId):null, [viewDraftId, reportDrafts])
  const esum = useMemo(()=>(project?buildSum(project, events):''), [project, events])
  const ob = useMemo(()=>buildOB(opinions), [opinions])
  const sects = useMemo(()=>{
    return sections.map((sec: ReportTemplateSection, idx: number) => {
      const mats = sec.materialTypes.length > 0 ? sel.filter(m => sec.materialTypes.includes(m.type)) : []
      let sum: string | null = null; let bulls: string[] = []
      if (sec.autoContent === 'summary') sum = esum
      if (sec.autoContent === 'stakeholder') bulls = ob
      let col = 'border-dark-400'
      if (sec.materialTypes.includes('typical_post') || sec.materialTypes.includes('spread_screenshot')) col = 'border-ferment'
      if (sec.materialTypes.includes('action_taken')) col = 'border-success'
      if (sec.materialTypes.includes('conclusion')) col = 'border-cooldown'
      if (sec.autoContent === 'summary') col = 'border-accent'
      return { t: sec.title, mats, col, sum, bulls, idx }
    })
  }, [sections, sel, esum, ob])
  const canGen = useMemo(() => viewDraftId == null && sel.length > 0 && !!project?.name, [viewDraftId, sel, project])
  const disableReason = useMemo(() => {
    if (viewDraftId != null) return '查看历史版本时无法生成，请先返回编辑'
    if (!project?.name) return '项目信息不存在'
    if (sel.length === 0) return '需要选中至少1条素材'
    return ''
  }, [viewDraftId, sel, project])
  const buildExportText = useMemo(() => {
    if (!project) return ''
    const L: string[] = [project.name, '']
    const full = isGen || viewDraftId != null
    if (sel.length === 0 && !full) { L.push('暂无选中素材'); return L.join('\n') }
    sects.forEach((s, i) => {
      L.push(`${NN[i]}、${s.t}`)
      if (s.sum) L.push(s.sum)
      else if (s.bulls.length > 0) s.bulls.forEach(b => L.push(`- ${b}`))
      else if (s.mats.length > 0) s.mats.forEach(m => L.push(full ? `- ${m.title}：${m.content}` : `- ${m.title}`))
      else L.push('（暂无内容）')
      L.push('')
    })
    if (ins.length > 0) {
      L.push('观点分层洞察')
      ins.forEach(it => {
        L.push(`【${ROLE_LABELS[it.role]}】`)
        if (it.demands.length) { L.push('🎯主要诉求：'); it.demands.forEach(d => L.push(`  - ${d}`)) }
        if (it.risks.length) { L.push('⚠️风险点：'); it.risks.forEach(r => L.push(`  - ${r}`)) }
        if (it.suggestions.length) { L.push('💡建议动作：'); it.suggestions.forEach(g => L.push(`  - ${g}`)) }
        L.push('')
      })
    } else if (full) { L.push('观点分层洞察', '（在时间线的观点面板筛选后，点击「插入至报告」可带入洞察）', '') }
    L.push('补充分析结论')
    L.push(manualText?.trim() ? manualText : (full ? '（暂无补充分析）' : '（支持自由编辑，生成版本后自动归档）'))
    L.push('')
    const ts = viewingDraft ? viewingDraft.generatedAt : (genAt ?? new Date().toISOString())
    L.push('---', `生成时间：${fmtF(ts)}`)
    return L.join('\n')
  }, [project, sel, isGen, sects, genAt, ins, manualText, viewDraftId, viewingDraft])
  useEffect(()=>{
    if(!toast) return
    if(toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(()=>setToast(null),2500)
    return ()=>{ if(toastTimer.current) clearTimeout(toastTimer.current) }
  }, [toast])
  useEffect(()=>{
    if(!id) return
    const draft = getDraftByProj(id)
    if(draft) {
      setIsGen(true); setGenAt(draft.generatedAt); setTemplate(draft.template)
      materials.forEach(m => { const s = draft.materialIds.includes(m.id); if(m.selected !== s) setMatSel(m.id, s) })
      setDraftNotice(true)
    }
  }, [id])
  const onTC = (t: ReportTemplateType) => { if(t === template) return; setTemplate(t); setToast(`已切换至${REPORT_TEMPLATE_LABELS[t]}模板，素材已自动归类`) }
  const onGen = () => {
    if(!project || !id || !canGen) return; mark(); const ts = new Date().toISOString()
    const did = saveDraft({ projectId: id, template, generatedAt: ts, outlineText: buildExportText, materialIds: sel.map(m => m.id), versionNumber: 0, manualAnalysis: '', insertedInsightsSection: '' })
    setDraftId(did); setIsGen(true); setGenAt(ts); setDraftNotice(false); setToast('汇报已生成并归档')
  }
  const onReset = () => { setDraftId(null); setIsGen(false); setGenAt(null); setDraftNotice(false) }
  const onBack = () => { clearView(); setIsGen(false) }
  const needEdit = () => { setToast('请点击重新编辑以修改素材') }
  const onTog = (mid: string) => { if(isGen || viewDraftId) { needEdit(); return } togSel(mid) }
  const onUp = (i: number) => { if(i<=0||isGen||viewDraftId) { if(isGen||viewDraftId) needEdit(); return } swap(materials[i].id, materials[i-1].id) }
  const onDn = (i: number) => { if(i>=materials.length-1||isGen||viewDraftId) { if(isGen||viewDraftId) needEdit(); return } swap(materials[i].id, materials[i+1].id) }
  const onExp = () => { if(!project) return; const b = new Blob([buildExportText], { type:'text/plain;charset=utf-8' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = `${project.name}.txt`; a.click(); URL.revokeObjectURL(u) }
  const onEye = (d: ReportDraft) => { switchDraft(d.id); setIsGen(true); setGenAt(d.generatedAt); setToast(`已切换至 V${d.versionNumber} 版本`) }
  const onDel = (d: ReportDraft) => { delDraft(d.id); setConfirmDel(null); setToast(`V${d.versionNumber} 版本已删除`) }
  const titleSuf = viewingDraft ? ` V${viewingDraft.versionNumber} 版` : ''
  const leftDis = viewDraftId != null
  if(!project) return <div className="flex h-screen items-center justify-center bg-dark-900 text-dark-300">项目不存在</div>
  return (
    <div className="flex h-screen flex-col bg-dark-900 text-dark-100">
      <header className="flex items-center gap-3 border-b border-dark-600 px-6 py-4">
        <button onClick={()=>nav(-1)} className="text-dark-300 hover:text-dark-100"><ArrowLeft size={20} /></button>
        <FileText size={20} className="text-accent" />
        <h1 className="text-lg font-semibold">{project.name} — 汇报输出</h1>
      </header>
      {viewDraftId != null && viewingDraft && (
        <div className="flex items-center justify-between gap-2 border-b border-accent/50 bg-accent/10 px-6 py-2 text-sm text-accent">
          <span>正在查看版本 V{viewingDraft.versionNumber}（{REPORT_TEMPLATE_LABELS[viewingDraft.template]}，{fmtS(viewingDraft.generatedAt)}）</span>
          <button onClick={onBack} className="flex items-center gap-1 rounded-md bg-accent px-3 py-1 font-medium text-dark-900 hover:bg-accent/90"><Edit2 size={12} /> 返回编辑</button>
        </div>
      )}
      {draftNotice && viewDraftId == null && (
        <div className="flex items-center justify-center gap-2 border-b border-dark-600 bg-dark-800/50 px-6 py-2 text-sm text-dark-300">
          <span>已加载上一版汇报草稿</span>
          <button onClick={onReset} className="flex items-center gap-1 text-accent hover:text-accent/80"><Edit2 size={12} /> 重新编辑</button>
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex w-[55%] flex-col border-r border-dark-600 relative">
          <div className="px-6 pt-5 pb-3">
            <div className="mb-4 flex items-center gap-3">
              <span className="text-sm text-dark-400">模板：</span>
              <div className="flex gap-2">
                {(Object.keys(REPORT_TEMPLATE_LABELS) as ReportTemplateType[]).map(t => (
                  <button key={t} onClick={()=>onTC(t)} disabled={leftDis}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${template === t ? 'bg-accent text-dark-900' : `bg-dark-700 text-dark-300 ${leftDis ? '' : 'hover:bg-dark-600'}`} ${leftDis ? 'opacity-60 cursor-not-allowed' : ''}`}>
                    {REPORT_TEMPLATE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="px-6 pb-3">
            <button onClick={()=>setHistOpen(o=>!o)} className="flex w-full items-center justify-between rounded-lg border border-dark-600 bg-dark-800 px-4 py-2.5 text-left hover:bg-dark-700/80">
              <div className="flex items-center gap-2">
                <History size={16} className="text-accent" />
                <span className="text-sm font-semibold">版本历史</span>
                <span className="rounded-full bg-dark-700 px-2 py-0.5 text-xs text-dark-400">{drafts.length}</span>
              </div>
              {histOpen ? <ChevronDown size={16} className="text-dark-400" /> : <ChevronRight size={16} className="text-dark-400" />}
            </button>
            {histOpen && (
              <div className="mt-2 space-y-1 rounded-lg border border-dark-600 bg-dark-800/60 p-2 max-h-56 overflow-y-auto">
                {drafts.length === 0 ? <p className="px-2 py-3 text-center text-xs text-dark-500">暂无历史版本，生成后将在此处显示</p> : drafts.map((d, idx) => (
                  <div key={d.id} onMouseEnter={()=>setHoverId(d.id)} onMouseLeave={()=>setHoverId(null)} onClick={()=>onEye(d)}
                    className={`relative flex items-center gap-3 rounded-md px-3 py-2 cursor-pointer transition-colors ${viewDraftId === d.id ? 'bg-accent/15 border border-accent/40' : 'hover:bg-dark-700/80 border border-transparent'}`}>
                    <span className="flex shrink-0 items-center gap-1.5">
                      <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${viewDraftId === d.id ? 'bg-accent text-dark-900' : 'bg-dark-700 text-accent'}`}>V{d.versionNumber}</span>
                      {idx === drafts.length - 1 && viewDraftId == null && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" />}
                      {viewDraftId === d.id && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs"><span className="text-dark-200 font-medium">{REPORT_TEMPLATE_LABELS[d.template]}</span><span className="text-dark-500">·</span><span className="text-dark-400">{fmtS(d.generatedAt)}</span></div>
                      <div className="mt-0.5 text-xs text-dark-500">{d.materialIds.length}条素材</div>
                    </div>
                    {hoverId === d.id && (
                      <div className="flex shrink-0 items-center gap-1" onClick={e=>e.stopPropagation()}>
                        <button onClick={()=>onEye(d)} className="rounded p-1 text-dark-400 hover:bg-dark-600 hover:text-dark-100" title="查看此版本"><Eye size={14} /></button>
                        <button onClick={()=>setConfirmDel(d.id)} className="rounded p-1 text-dark-400 hover:bg-dark-600 hover:text-breakout" title="删除此版本"><Trash2 size={14} /></button>
                      </div>
                    )}
                    {confirmDel === d.id && (
                      <div className="absolute right-0 top-full mt-1 z-20 rounded-lg border border-dark-500 bg-dark-700 p-3 shadow-xl w-60" onClick={e=>e.stopPropagation()}>
                        <p className="text-xs text-dark-200 mb-3">确定要删除 V{d.versionNumber} 版本吗？此操作不可恢复。</p>
                        <div className="flex justify-end gap-2">
                          <button onClick={()=>setConfirmDel(null)} className="rounded px-3 py-1 text-xs bg-dark-600 text-dark-200 hover:bg-dark-500">取消</button>
                          <button onClick={()=>onDel(d)} className="rounded px-3 py-1 text-xs bg-breakout text-white hover:bg-breakout/90">删除</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="px-6 pb-3 pt-1 flex items-center justify-between">
            <div><h2 className="text-base font-semibold">材料选择</h2><p className="mt-0.5 text-sm text-dark-300">从时间线中选择典型素材</p></div>
            <span className="text-xs text-dark-500">已选 {sel.length}/{materials.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto px-6 pb-6 relative">
            {leftDis && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-dark-900/70 backdrop-blur-[1px]">
                <div className="rounded-lg border border-dark-500 bg-dark-800 px-5 py-4 text-center">
                  <Lock size={22} className="mx-auto mb-2 text-accent" />
                  <p className="text-sm text-dark-300">历史版本只读</p>
                  <button onClick={onBack} className="mt-3 rounded-md bg-accent px-4 py-1.5 text-xs font-semibold text-dark-900 hover:bg-accent/90">返回编辑</button>
                </div>
              </div>
            )}
            <div className="space-y-3">
              {materials.map((mat, i) => {
                const Ic = TI[mat.type]
                return (
                  <div key={mat.id} className={`relative flex items-start gap-3 rounded-lg border p-4 transition-opacity ${mat.selected ? `${TB[mat.type]} bg-dark-700/50` : 'border-dark-600 bg-dark-800'} ${isGen && !leftDis ? 'opacity-60 pointer-events-none' : ''}`}>
                    {isGen && !leftDis && <div className="absolute right-3 top-3"><Lock size={14} className="text-dark-400" /></div>}
                    <button onClick={()=>onTog(mat.id)} className="mt-0.5 shrink-0">{mat.selected?<CheckSquare size={18} className="text-accent"/>:<Square size={18} className="text-dark-400"/>}</button>
                    <Ic size={18} className="mt-0.5 shrink-0 text-dark-400" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TC[mat.type]}`}>{MATERIAL_TYPE_LABELS[mat.type]}</span>
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
                {(isGen || viewDraftId != null) && <div className="h-2 w-2 rounded-full bg-success"/>}
                <span className="rounded bg-dark-700 px-2 py-0.5 text-xs text-dark-300">[{REPORT_TEMPLATE_LABELS[template]}]{titleSuf}</span>
                <h2 className="text-base font-semibold">{isGen || viewDraftId != null ? '正式汇报提纲' : '提纲草稿'}</h2>
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-dark-400">
                {viewingDraft ? <span>版本生成于 {fmtS(viewingDraft.generatedAt)}</span> : (isGen && genAt?<span>生成于 {fmtS(genAt)}</span>:<span>实时预览，选择素材后即时更新</span>)}
              </div>
            </div>
            <div className="flex gap-2">
              {viewDraftId != null ? (
                <button onClick={onBack} className="flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-dark-900 hover:bg-accent/90"><Edit2 size={14} /> 返回编辑</button>
              ) : !isGen ? (
                <div className="relative">
                  <button onClick={onGen} disabled={!canGen} onMouseEnter={()=>{ if(!canGen) setTipVisible(true) }} onMouseLeave={()=>setTipVisible(false)}
                    className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${canGen ? 'bg-accent text-dark-900 hover:bg-accent/90' : 'bg-dark-700 text-dark-500 cursor-not-allowed'}`}>一键生成</button>
                  {tipVisible && !canGen && (
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-dark-500 bg-dark-700 px-3 py-1.5 text-xs text-dark-200 shadow-lg z-20">
                      {disableReason}<div className="absolute left-1/2 -bottom-1 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-dark-500 bg-dark-700" />
                    </div>
                  )}
                </div>
              ) : (
                <button onClick={onReset} className="flex items-center gap-1.5 rounded-md bg-dark-700 px-3 py-1.5 text-sm text-dark-200 hover:bg-dark-600">重新编辑</button>
              )}
              <button onClick={onExp} className="flex items-center gap-1.5 rounded-md bg-dark-700 px-3 py-1.5 text-sm text-dark-200 hover:bg-dark-600"><Download size={14}/>导出文本</button>
              <button onClick={()=>window.print()} className="flex items-center gap-1.5 rounded-md bg-dark-700 px-3 py-1.5 text-sm text-dark-200 hover:bg-dark-600"><Printer size={14}/>打印</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <div className="rounded-lg bg-dark-800 p-6">
              <h3 className="mb-6 text-center text-lg font-bold">{project.name}{titleSuf ? ` · V${viewingDraft?.versionNumber}版汇报提纲` : ''}</h3>
              {sel.length===0 && !isGen && viewDraftId == null ? (
                <p className="py-8 text-center text-sm text-dark-400">暂无选中素材</p>
              ) : (
                <div className="space-y-5">
                  {sects.map((s, i) => (
                    <div key={i}>
                      <div className="flex items-stretch gap-3">
                        <div className={`w-1 shrink-0 rounded-full ${s.col}`}/>
                        <div className="flex-1">
                          <h4 className="font-bold">{NN[i]}、{s.t}</h4>
                          {s.sum ? <p className="mt-2 text-sm text-dark-300 leading-relaxed">{s.sum}</p>
                          : s.bulls.length>0 ? (
                            <ul className="mt-2 space-y-1.5">{s.bulls.map((b,bi)=>(
                              <li key={bi} className="flex items-start gap-2 text-sm text-dark-300"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-dark-400"/><span>{b}</span></li>
                            ))}</ul>
                          ) : s.mats.length>0 ? (
                            <ul className="mt-2 space-y-1.5">{s.mats.map(m=>(
                              <li key={m.id} className="flex items-start gap-2 text-sm text-dark-300">
                                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-dark-400"/>
                                <div><span className="font-medium text-dark-200">{m.title}</span>{(isGen || viewDraftId != null) && <p className="mt-1 text-xs leading-relaxed text-dark-400">{m.content}</p>}</div>
                              </li>
                            ))}</ul>
                          ) : <p className="mt-2 text-sm text-dark-500">（暂无内容）</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div>
                    <div className="flex items-stretch gap-3">
                      <div className="w-1 shrink-0 rounded-full bg-warning/70" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2"><Lightbulb size={15} className="text-warning" /><h4 className="font-bold">观点分层洞察</h4></div>
                        {ins.length === 0 ? <p className="mt-2 text-sm text-dark-400">（在时间线的观点面板筛选后，点击「插入至报告」可带入洞察）</p> : (
                          <div className="mt-3 space-y-3">
                            {ins.map((it, ii) => (
                              <div key={ii} className="rounded-lg border border-dark-600 bg-dark-700/40 p-3.5">
                                <div className="mb-2 font-semibold text-dark-100">{ROLE_LABELS[it.role]}</div>
                                <ul className="space-y-2 text-sm">
                                  {it.demands.length>0 && <li className="text-dark-300"><span className="mr-1">🎯</span><span className="font-medium text-dark-200">主要诉求：</span><ul className="mt-1 ml-5 space-y-1">{it.demands.map((d,di)=><li key={di} className="flex items-start gap-1.5"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-dark-500"/>{d}</li>)}</ul></li>}
                                  {it.risks.length>0 && <li className="text-breakout/90"><span className="mr-1">⚠️</span><span className="font-medium text-dark-200">风险点：</span><ul className="mt-1 ml-5 space-y-1">{it.risks.map((r,ri)=><li key={ri} className="flex items-start gap-1.5"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-breakout/60"/>{r}</li>)}</ul></li>}
                                  {it.suggestions.length>0 && <li className="text-success/90"><span className="mr-1">💡</span><span className="font-medium text-dark-200">建议动作：</span><ul className="mt-1 ml-5 space-y-1">{it.suggestions.map((g,gi)=><li key={gi} className="flex items-start gap-1.5"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-success/60"/>{g}</li>)}</ul></li>}
                                </ul>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-stretch gap-3">
                      <div className="w-1 shrink-0 rounded-full bg-cooldown" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">{viewDraftId != null || isGen ? <FileText size={15} className="text-cooldown" /> : <Edit2 size={15} className="text-cooldown" />}<h4 className="font-bold">补充分析结论</h4></div>
                        {viewDraftId != null || isGen ? (
                          manualText?.trim() ? <p className="mt-2 text-sm text-dark-300 leading-relaxed whitespace-pre-wrap">{manualText}</p> : <p className="mt-2 text-sm text-dark-500">（暂无补充分析）</p>
                        ) : (
                          <div className="mt-2">
                            <textarea value={manualText} onChange={(e)=>setManual(e.target.value)} rows={4} placeholder="可手动补充本次复盘的分析结论，生成后将保存到版本中..."
                              className="w-full resize-none rounded-lg border border-dark-600 bg-dark-900 px-3 py-2.5 text-sm text-dark-200 placeholder-dark-500 focus:border-cooldown/70 focus:outline-none focus:ring-1 focus:ring-cooldown/50" />
                            <p className="mt-1.5 text-xs text-dark-500">（支持自由编辑，生成版本后自动归档）</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {toast && <div className="pointer-events-none fixed bottom-8 left-1/2 -translate-x-1/2 rounded-lg bg-dark-700/90 px-4 py-2 text-xs text-dark-100 shadow-lg border border-dark-600 backdrop-blur-sm">{toast}</div>}
    </div>
  )
}
