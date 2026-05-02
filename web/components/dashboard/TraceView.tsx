'use client'

import { useState, useEffect } from 'react'
import { 
  GitBranch,
  Clock,
  DollarSign,
  Zap,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react'

interface TraceSpan {
  id: string
  parent_id?: string
  name: string
  model?: string
  provider?: string
  input_tokens: number
  output_tokens: number
  total_tokens: number
  cost_usd: number
  latency_ms: number
  ttft_ms: number
  status: 'success' | 'error' | 'pending'
  error_message?: string
  start_time: string
  end_time?: string
  metadata?: Record<string, any>
  children?: TraceSpan[]
}

interface Trace {
  id: string
  name: string
  total_latency_ms: number
  total_cost_usd: number
  total_tokens: number
  span_count: number
  status: 'success' | 'error' | 'partial'
  start_time: string
  end_time?: string
  spans: TraceSpan[]
}

interface TraceViewProps {
  traceId: string
}

export function TraceView({ traceId }: TraceViewProps) {
  const [trace, setTrace] = useState<Trace | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedSpans, setExpandedSpans] = useState<Set<string>>(new Set())
  const [selectedSpan, setSelectedSpan] = useState<TraceSpan | null>(null)

  useEffect(() => {
    fetchTrace()
  }, [traceId])

  const fetchTrace = async () => {
    setLoading(true)
    try {
      // TODO: 从后端获取 trace 数据
      // 临时使用模拟数据
      const mockTrace: Trace = {
        id: traceId,
        name: '用户请求处理',
        total_latency_ms: 3200,
        total_cost_usd: 0.013,
        total_tokens: 450,
        span_count: 5,
        status: 'success',
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 3200).toISOString(),
        spans: [
          {
            id: 'span_1',
            name: 'Agent 思考',
            model: 'gpt-4',
            provider: 'openai',
            input_tokens: 100,
            output_tokens: 100,
            total_tokens: 200,
            cost_usd: 0.006,
            latency_ms: 800,
            ttft_ms: 200,
            status: 'success',
            start_time: new Date().toISOString(),
            end_time: new Date(Date.now() + 800).toISOString(),
            children: [
              {
                id: 'span_2',
                parent_id: 'span_1',
                name: '调用 search_flights',
                input_tokens: 0,
                output_tokens: 0,
                total_tokens: 0,
                cost_usd: 0,
                latency_ms: 500,
                status: 'success',
                start_time: new Date(Date.now() + 300).toISOString(),
                end_time: new Date(Date.now() + 800).toISOString(),
              },
            ],
          },
          {
            id: 'span_3',
            name: 'Agent 总结',
            model: 'gpt-4',
            provider: 'openai',
            input_tokens: 80,
            output_tokens: 70,
            total_tokens: 150,
            cost_usd: 0.004,
            latency_ms: 600,
            ttft_ms: 150,
            status: 'success',
            start_time: new Date(Date.now() + 800).toISOString(),
            end_time: new Date(Date.now() + 1400).toISOString(),
            children: [
              {
                id: 'span_4',
                parent_id: 'span_3',
                name: '调用 book_flight',
                input_tokens: 0,
                output_tokens: 0,
                total_tokens: 0,
                cost_usd: 0,
                latency_ms: 800,
                status: 'success',
                start_time: new Date(Date.now() + 1000).toISOString(),
                end_time: new Date(Date.now() + 1800).toISOString(),
              },
            ],
          },
          {
            id: 'span_5',
            name: '最终回复',
            model: 'gpt-4',
            provider: 'openai',
            input_tokens: 50,
            output_tokens: 50,
            total_tokens: 100,
            cost_usd: 0.003,
            latency_ms: 500,
            ttft_ms: 100,
            status: 'success',
            start_time: new Date(Date.now() + 1800).toISOString(),
            end_time: new Date(Date.now() + 2300).toISOString(),
          },
        ],
      }
      
      setTrace(mockTrace)
    } catch (error) {
      console.error('Failed to fetch trace:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleSpan = (spanId: string) => {
    const newExpanded = new Set(expandedSpans)
    if (newExpanded.has(spanId)) {
      newExpanded.delete(spanId)
    } else {
      newExpanded.add(spanId)
    }
    setExpandedSpans(newExpanded)
  }

  const formatLatency = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-success-400" />
      case 'error':
        return <XCircle className="w-4 h-4 text-danger-400" />
      case 'pending':
        return <Clock className="w-4 h-4 text-warning-400" />
      default:
        return null
    }
  }

  const renderSpan = (span: TraceSpan, depth: number = 0) => {
    const hasChildren = span.children && span.children.length > 0
    const isExpanded = expandedSpans.has(span.id)
    const isSelected = selectedSpan?.id === span.id

    return (
      <div key={span.id}>
        <div
          className={`flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-gray-800/50 ${
            isSelected ? 'bg-primary-500/10 border-l-2 border-primary-500' : ''
          }`}
          style={{ paddingLeft: `${depth * 24 + 16}px` }}
          onClick={() => setSelectedSpan(span)}
        >
          {/* 展开/折叠按钮 */}
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleSpan(span.id)
              }}
              className="p-1 hover:bg-gray-700 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          ) : (
            <div className="w-6" />
          )}

          {/* 状态图标 */}
          {getStatusIcon(span.status)}

          {/* 名称 */}
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{span.name}</div>
            {span.model && (
              <div className="text-xs text-gray-500">
                {span.model} • {span.provider}
              </div>
            )}
          </div>

          {/* 指标 */}
          <div className="flex items-center gap-4 text-sm">
            {span.total_tokens > 0 && (
              <span className="text-gray-400">
                {span.total_tokens} tokens
              </span>
            )}
            {span.cost_usd > 0 && (
              <span className="text-gray-400">
                {formatCost(span.cost_usd)}
              </span>
            )}
            <span className={`font-mono ${
              span.latency_ms < 500 ? 'text-success-400' :
              span.latency_ms < 1000 ? 'text-warning-400' :
              'text-danger-400'
            }`}>
              {formatLatency(span.latency_ms)}
            </span>
          </div>
        </div>

        {/* 子 Span */}
        {hasChildren && isExpanded && (
          <div>
            {span.children!.map(child => renderSpan(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  if (!trace) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-warning-400" />
        <p className="text-lg">Trace 未找到</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Trace 概览 */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold">{trace.name}</h2>
            <p className="text-sm text-gray-500 font-mono">{trace.id}</p>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(trace.status)}
            <span className={`px-2 py-1 rounded-full text-xs ${
              trace.status === 'success' ? 'bg-success-500/10 text-success-400' :
              trace.status === 'error' ? 'bg-danger-500/10 text-danger-400' :
              'bg-warning-500/10 text-warning-400'
            }`}>
              {trace.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-500/10 text-primary-400 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">总延迟</p>
              <p className="font-semibold">{formatLatency(trace.total_latency_ms)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-success-500/10 text-success-400 rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">总成本</p>
              <p className="font-semibold">{formatCost(trace.total_cost_usd)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-warning-500/10 text-warning-400 rounded-lg">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">总 Tokens</p>
              <p className="font-semibold">{trace.total_tokens.toLocaleString()}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Span 数量</p>
              <p className="font-semibold">{trace.span_count}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 时间轴视图 */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">时间轴</h3>
        <div className="relative">
          {/* 时间轴线 */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-700"></div>
          
          {/* Spans */}
          <div className="space-y-2">
            {trace.spans.map(span => renderSpan(span))}
          </div>
        </div>
      </div>

      {/* Span 详情 */}
      {selectedSpan && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Span 详情</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-500">名称</label>
              <p className="font-mono">{selectedSpan.name}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">ID</label>
              <p className="font-mono text-sm">{selectedSpan.id}</p>
            </div>
            {selectedSpan.model && (
              <>
                <div>
                  <label className="text-sm text-gray-500">模型</label>
                  <p>{selectedSpan.model}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">提供商</label>
                  <p>{selectedSpan.provider}</p>
                </div>
              </>
            )}
            <div>
              <label className="text-sm text-gray-500">延迟</label>
              <p className="font-mono">{formatLatency(selectedSpan.latency_ms)}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">TTFT</label>
              <p className="font-mono">{formatLatency(selectedSpan.ttft_ms)}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Tokens</label>
              <p>
                <span className="text-gray-400">{selectedSpan.input_tokens}</span>
                <span className="mx-1">→</span>
                <span>{selectedSpan.output_tokens}</span>
                <span className="text-gray-500 ml-2">({selectedSpan.total_tokens})</span>
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-500">成本</label>
              <p className="font-mono">{formatCost(selectedSpan.cost_usd)}</p>
            </div>
          </div>
          
          {selectedSpan.error_message && (
            <div className="mt-4 p-4 bg-danger-500/10 rounded-lg">
              <label className="text-sm text-danger-400">错误信息</label>
              <pre className="mt-2 text-sm font-mono">{selectedSpan.error_message}</pre>
            </div>
          )}
        </div>
      )}

      {/* 甘特图视图（TODO） */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">甘特图</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>甘特图视图（TODO）</p>
            <p className="text-sm mt-1">将显示各 Span 的时间分布</p>
          </div>
        </div>
      </div>
    </div>
  )
}
