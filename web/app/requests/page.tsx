'use client'

import { useState, useEffect } from 'react'
import { 
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ExternalLink
} from 'lucide-react'

interface Request {
  id: string
  timestamp: string
  model: string
  provider: string
  input_tokens: number
  output_tokens: number
  total_tokens: number
  cost_usd: number
  latency_ms: number
  status_code: number
  is_error: boolean
  user_id: string
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [filters, setFilters] = useState({
    model: '',
    is_error: '',
  })

  useEffect(() => {
    fetchRequests()
  }, [page, filters])

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: ((page - 1) * limit).toString(),
      })
      
      if (filters.model) params.append('model', filters.model)
      if (filters.is_error) params.append('is_error', filters.is_error)

      const response = await fetch(`/api/requests?${params}`)
      if (response.ok) {
        const data = await response.json()
        setRequests(data.data || [])
        setTotal(data.total || 0)
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalPages = Math.ceil(total / limit)

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`
  }

  const formatLatency = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  return (
    <div className="p-6 space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">请求</h1>
          <p className="text-gray-500 mt-1">查看所有 LLM API 请求记录</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            共 {total} 条记录
          </span>
        </div>
      </div>

      {/* 筛选器 */}
      <div className="card">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm text-gray-400 mb-1">模型</label>
            <select
              value={filters.model}
              onChange={(e) => setFilters({ ...filters, model: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">全部模型</option>
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              <option value="claude-3-opus">Claude 3 Opus</option>
              <option value="claude-3-sonnet">Claude 3 Sonnet</option>
              <option value="deepseek-chat">DeepSeek Chat</option>
            </select>
          </div>
          
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm text-gray-400 mb-1">状态</label>
            <select
              value={filters.is_error}
              onChange={(e) => setFilters({ ...filters, is_error: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">全部状态</option>
              <option value="false">成功</option>
              <option value="true">错误</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => setFilters({ model: '', is_error: '' })}
              className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm transition-colors"
            >
              重置
            </button>
          </div>
        </div>
      </div>

      {/* 请求列表 */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="table-auto">
            <thead>
              <tr>
                <th>时间</th>
                <th>模型</th>
                <th>提供商</th>
                <th>Tokens</th>
                <th>成本</th>
                <th>延迟</th>
                <th>状态</th>
                <th>用户</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-gray-500">
                    <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                    加载中...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-gray-500">
                    <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>暂无请求记录</p>
                    <p className="text-sm mt-1">接入 LLM API 后将显示请求记录</p>
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-800/50">
                    <td className="font-mono text-sm">
                      {formatTime(req.timestamp)}
                    </td>
                    <td>
                      <span className="bg-gray-700 px-2 py-1 rounded text-sm">
                        {req.model}
                      </span>
                    </td>
                    <td className="text-sm text-gray-400">
                      {req.provider || '-'}
                    </td>
                    <td className="text-sm">
                      <span className="text-gray-400">{req.input_tokens}</span>
                      <span className="text-gray-600 mx-1">→</span>
                      <span className="text-gray-300">{req.output_tokens}</span>
                    </td>
                    <td className="font-mono text-sm">
                      {formatCost(req.cost_usd)}
                    </td>
                    <td className="font-mono text-sm">
                      {formatLatency(req.latency_ms)}
                    </td>
                    <td>
                      {req.is_error ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-danger-500/10 text-danger-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-danger-500"></span>
                          {req.status_code}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-success-500/10 text-success-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-success-500"></span>
                          {req.status_code}
                        </span>
                      )}
                    </td>
                    <td className="text-sm text-gray-400">
                      {req.user_id || '-'}
                    </td>
                    <td>
                      <a
                        href={`/requests/${req.id}`}
                        className="text-primary-400 hover:text-primary-300"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-800">
            <div className="text-sm text-gray-500">
              显示 {(page - 1) * limit + 1} - {Math.min(page * limit, total)} / {total}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
