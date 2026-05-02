'use client'

import { useState, useEffect } from 'react'
import { 
  GitBranch,
  Search,
  Filter,
  Clock,
  DollarSign,
  Zap,
  ChevronRight
} from 'lucide-react'
import { TraceView } from '@/components/dashboard/TraceView'

interface TraceSummary {
  id: string
  name: string
  total_latency_ms: number
  total_cost_usd: number
  total_tokens: number
  span_count: number
  status: 'success' | 'error' | 'partial'
  start_time: string
}

export default function TracesPage() {
  const [traces, setTraces] = useState<TraceSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    fetchTraces()
  }, [])

  const fetchTraces = async () => {
    setLoading(true)
    try {
      // TODO: 从后端获取 traces 列表
      // 临时使用模拟数据
      const mockTraces: TraceSummary[] = [
        {
          id: 'trace_1',
          name: '用户请求处理',
          total_latency_ms: 3200,
          total_cost_usd: 0.013,
          total_tokens: 450,
          span_count: 5,
          status: 'success',
          start_time: new Date().toISOString(),
        },
        {
          id: 'trace_2',
          name: '代码生成任务',
          total_latency_ms: 8500,
          total_cost_usd: 0.045,
          total_tokens: 1200,
          span_count: 8,
          status: 'success',
          start_time: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 'trace_3',
          name: '文档查询',
          total_latency_ms: 1200,
          total_cost_usd: 0.005,
          total_tokens: 180,
          span_count: 3,
          status: 'error',
          start_time: new Date(Date.now() - 7200000).toISOString(),
        },
      ]
      
      setTraces(mockTraces)
    } catch (error) {
      console.error('Failed to fetch traces:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatLatency = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-success-500/10 text-success-400'
      case 'error':
        return 'bg-danger-500/10 text-danger-400'
      case 'partial':
        return 'bg-warning-500/10 text-warning-400'
      default:
        return 'bg-gray-500/10 text-gray-400'
    }
  }

  const filteredTraces = traces.filter(trace => {
    const matchesSearch = trace.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         trace.id.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || trace.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="p-6 space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agent Trace</h1>
          <p className="text-gray-500 mt-1">查看 Agent 多步推理链</p>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="card">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索 Trace..."
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>
          
          <div className="flex-1 min-w-[200px]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">全部状态</option>
              <option value="success">成功</option>
              <option value="error">错误</option>
              <option value="partial">部分成功</option>
            </select>
          </div>
        </div>
      </div>

      {/* Trace 列表 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-lg font-semibold">Traces ({filteredTraces.length})</h3>
          
          {loading ? (
            <div className="card text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
            </div>
          ) : filteredTraces.length === 0 ? (
            <div className="card text-center py-8">
              <GitBranch className="w-12 h-12 mx-auto mb-4 text-gray-600" />
              <p className="text-gray-500">暂无 Trace 数据</p>
              <p className="text-sm text-gray-600 mt-1">
                在请求中传入 trace_id 后将显示在这里
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTraces.map((trace) => (
                <div
                  key={trace.id}
                  className={`card cursor-pointer transition-all hover:border-primary-500 ${
                    selectedTraceId === trace.id ? 'border-primary-500 bg-primary-500/5' : ''
                  }`}
                  onClick={() => setSelectedTraceId(trace.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(trace.status)}`}>
                        {trace.status}
                      </span>
                      <span className="text-sm text-gray-500">{trace.span_count} spans</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  </div>
                  
                  <h4 className="font-semibold mb-2">{trace.name}</h4>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatLatency(trace.total_latency_ms)}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      {formatCost(trace.total_cost_usd)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {trace.total_tokens}
                    </span>
                  </div>
                  
                  <div className="text-xs text-gray-500 mt-2">
                    {formatTime(trace.start_time)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Trace 详情 */}
        <div className="lg:col-span-2">
          {selectedTraceId ? (
            <TraceView traceId={selectedTraceId} />
          ) : (
            <div className="card text-center py-20">
              <GitBranch className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <h3 className="text-lg font-semibold mb-2">选择一个 Trace</h3>
              <p className="text-gray-500">
                点击左侧列表中的 Trace 查看详细信息
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 使用说明 */}
      <div className="card border-primary-500/30">
        <h3 className="text-lg font-semibold mb-4 text-primary-400">💡 如何使用 Agent Trace？</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold mb-2">方式一：通过 Header</h4>
            <pre className="bg-gray-800 p-3 rounded-lg text-sm font-mono overflow-x-auto">
{`import openai

client = openai.OpenAI(base_url="http://localhost:3000/v1")

response = client.chat.completions.create(
    model="gpt-4",
    messages=[...],
    extra_headers={
        "X-Trace-Id": "tr_abc123"
    }
)`}
            </pre>
          </div>
          <div>
            <h4 className="font-semibold mb-2">方式二：通过 Metadata</h4>
            <pre className="bg-gray-800 p-3 rounded-lg text-sm font-mono overflow-x-auto">
{`response = client.chat.completions.create(
    model="gpt-4",
    messages=[...],
    metadata={
        "trace_id": "tr_abc123",
        "step": "thinking"
    }
)`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
