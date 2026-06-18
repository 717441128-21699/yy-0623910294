import { useStore } from '@/store/useStore'
import { useParams, useNavigate } from 'react-router-dom'
import { useState, useMemo } from 'react'
import {
  ArrowLeft, FileText, CheckSquare, Square, Image,
  MessageSquare, Shield, Lightbulb, Download, Printer,
  GripVertical, ChevronUp, ChevronDown,
} from 'lucide-react'
import type { ReportMaterial, MaterialType } from '@/types'
import { MATERIAL_TYPE_LABELS } from '@/types'

const TYPE_COLORS: Record<MaterialType, string> = {
  typical_post: 'bg-accent/20 text-accent',
  spread_screenshot: 'bg-ferment/20 text-ferment',
  action_taken: 'bg-success/20 text-success',
  conclusion: 'bg-cooldown/20 text-cooldown',
}

const TYPE_ICONS: Record<MaterialType, typeof MessageSquare> = {
  typical_post: MessageSquare,
  spread_screenshot: Image,
  action_taken: Shield,
  conclusion: Lightbulb,
}

const TYPE_BORDER: Record<MaterialType, string> = {
  typical_post: 'border-accent/50',
  spread_screenshot: 'border-ferment/50',
  action_taken: 'border-success/50',
  conclusion: 'border-cooldown/50',
}

function generateReportText(
  projectName: string,
  selected: ReportMaterial[]
): string {
  const grouped: Record<MaterialType, ReportMaterial[]> = {
    typical_post: [], spread_screenshot: [],
    action_taken: [], conclusion: [],
  }
  selected.forEach((m) => grouped[m.type].push(m))

  const lines: string[] = []
  lines.push(`${projectName}\n`)
  lines.push('一、事件概述')
  lines.push(`${projectName}舆情事件整体回顾。\n`)

  const evolution = [...grouped.typical_post, ...grouped.spread_screenshot]
  if (evolution.length) {
    lines.push('二、舆情演化过程')
    evolution.forEach((m) => lines.push(`- ${m.title}：${m.content}`))
    lines.push('')
  }

  lines.push('三、各方观点')
  lines.push('基于舆情分析数据的各方观点汇总。\n')

  if (grouped.action_taken.length) {
    lines.push('四、处置评估')
    grouped.action_taken.forEach((m) => lines.push(`- ${m.title}：${m.content}`))
    lines.push('')
  }

  if (grouped.conclusion.length) {
    lines.push('五、改进建议')
    grouped.conclusion.forEach((m) => lines.push(`- ${m.title}：${m.content}`))
    lines.push('')
  }

  return lines.join('\n')
}

export default function Report() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getProjectById, getMaterialsByProject, toggleMaterialSelection, updateMaterialOrder } = useStore()

  const project = id ? getProjectById(id) : undefined
  const materials = useMemo(
    () => (id ? getMaterialsByProject(id).sort((a, b) => a.sortOrder - b.sortOrder) : []),
    [id, getMaterialsByProject]
  )

  const selectedMaterials = useMemo(
    () => materials.filter((m) => m.selected),
    [materials]
  )

  const groupedSelected = useMemo(() => {
    const g: Record<MaterialType, ReportMaterial[]> = {
      typical_post: [], spread_screenshot: [],
      action_taken: [], conclusion: [],
    }
    selectedMaterials.forEach((m) => g[m.type].push(m))
    return g
  }, [selectedMaterials])

  const outlineSections = useMemo(() => [
    { title: '事件概述', items: [] as ReportMaterial[], color: 'border-accent' },
    { title: '舆情演化过程', items: [...groupedSelected.typical_post, ...groupedSelected.spread_screenshot], color: 'border-ferment' },
    { title: '各方观点', items: [] as ReportMaterial[], color: 'border-dark-400' },
    { title: '处置评估', items: groupedSelected.action_taken, color: 'border-success' },
    { title: '改进建议', items: groupedSelected.conclusion, color: 'border-cooldown' },
  ], [groupedSelected])

  const handleExport = () => {
    const text = generateReportText(project?.name ?? '舆情报告', selectedMaterials)
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project?.name ?? '舆情报告'}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleMoveUp = (index: number) => {
    if (index <= 0) return
    const mat = materials[index]
    const prev = materials[index - 1]
    updateMaterialOrder(mat.id, prev.sortOrder)
    updateMaterialOrder(prev.id, mat.sortOrder)
  }

  const handleMoveDown = (index: number) => {
    if (index >= materials.length - 1) return
    const mat = materials[index]
    const next = materials[index + 1]
    updateMaterialOrder(mat.id, next.sortOrder)
    updateMaterialOrder(next.id, mat.sortOrder)
  }

  if (!project) {
    return (
      <div className="flex h-screen items-center justify-center bg-dark-900 text-dark-300">
        项目不存在
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-dark-900 text-dark-100">
      <header className="flex items-center gap-3 border-b border-dark-600 px-6 py-4">
        <button onClick={() => navigate(-1)} className="text-dark-300 hover:text-dark-100">
          <ArrowLeft size={20} />
        </button>
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
              {materials.map((mat, idx) => {
                const Icon = TYPE_ICONS[mat.type]
                return (
                  <div
                    key={mat.id}
                    className={`flex items-start gap-3 rounded-lg border p-4 ${
                      mat.selected
                        ? `${TYPE_BORDER[mat.type]} bg-dark-700/50`
                        : 'border-dark-600 bg-dark-800'
                    }`}
                  >
                    <button
                      onClick={() => toggleMaterialSelection(mat.id)}
                      className="mt-0.5 shrink-0"
                    >
                      {mat.selected ? (
                        <CheckSquare size={18} className="text-accent" />
                      ) : (
                        <Square size={18} className="text-dark-400" />
                      )}
                    </button>
                    <Icon size={18} className="mt-0.5 shrink-0 text-dark-400" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[mat.type]}`}>
                          {MATERIAL_TYPE_LABELS[mat.type]}
                        </span>
                        <span className="truncate font-medium">{mat.title}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-dark-300">{mat.content}</p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-0.5">
                      <button
                        onClick={() => handleMoveUp(idx)}
                        className="text-dark-400 hover:text-dark-100"
                        disabled={idx === 0}
                      >
                        <ChevronUp size={16} />
                      </button>
                      <button
                        onClick={() => handleMoveDown(idx)}
                        className="text-dark-400 hover:text-dark-100"
                        disabled={idx === materials.length - 1}
                      >
                        <ChevronDown size={16} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="flex w-[45%] flex-col">
          <div className="flex items-center justify-between px-6 pt-5 pb-3">
            <h2 className="text-base font-semibold">汇报提纲</h2>
            <div className="flex gap-2">
              <button className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-dark-900 hover:bg-accent/90">
                一键生成
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 rounded-md bg-dark-700 px-3 py-1.5 text-sm text-dark-200 hover:bg-dark-600"
              >
                <Download size={14} />
                导出文本
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 rounded-md bg-dark-700 px-3 py-1.5 text-sm text-dark-200 hover:bg-dark-600"
              >
                <Printer size={14} />
                打印
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <div className="rounded-lg bg-dark-800 p-6">
              <h3 className="mb-6 text-center text-lg font-bold">{project.name}</h3>
              {selectedMaterials.length === 0 ? (
                <p className="py-8 text-center text-sm text-dark-400">
                  请从左侧选择素材以生成汇报提纲
                </p>
              ) : (
                <div className="space-y-5">
                  {outlineSections.map((section, i) => (
                    <div key={i}>
                      <div className="flex items-stretch gap-3">
                        <div className={`w-1 shrink-0 rounded-full ${section.color}`} />
                        <div className="flex-1">
                          <h4 className="font-bold">{['一','二','三','四','五'][i]}、{section.title}</h4>
                          {section.items.length > 0 ? (
                            <ul className="mt-2 space-y-1.5">
                              {section.items.map((m) => (
                                <li key={m.id} className="flex items-start gap-2 text-sm text-dark-300">
                                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-dark-400" />
                                  <span>{m.title}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-2 text-sm text-dark-500">（自动生成内容）</p>
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
    </div>
  )
}
