'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { 
  ArrowLeft,
  Copy,
  Clock,
  DollarSign,
  Zap,
  User,
  Tag,
  AlertTriangle
} from 'lucide-react'

interface RequestDetail {
  id: string
  timestamp: string
  model: string
  provider: string
  input_tokens: number
  output_tokens: number
  total_tokens: number
  cost_usd: number
  latency_ms: number
  ttft_ms: number
  status_code: number
  is_error: boolean
  error_message: string
  stream: boolean
  user_id: string
  tags: string
  metadata: string
  request_body: string
  response_body: string
  trace_id: string
}

export default function RequestDetailPage() {
  const params = useParams()
  const [request, setRequest] = useState<RequestDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    if (params.id) {
      fetchRequest(params.id as string)
    }
  }, [params.id])

  const fetchRequest = async (id: string) => {
    try {
      const response = await fetch(`/api/requests/${id}`)
      if (response.ok) {
        const data = await response.json()
        setRequest(data)
      }
    } catch (error) {
      console.error('Failed to fetch request:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(field)
      setTimeout(() => setCopied(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const formatLatency = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mt-20"></div>
      </div>
    )
  }

  if (!request) {
    return (
      <div className="p-6">
        <div className="text-center py-20">
          <AlertTriangle className="w-12 h-12 text-warning-400 mx-auto mb-4" />
          <p className="text-lg">请求未找到</p>
          <a href="/requests" className="text-primary-400 hover:text-primary-300 mt-4 inline-block">
            返回请求列表
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* 头部 */}
      <div className="flex items-center gap-4">
        <a
          href="/requests"
          className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </a>
        <div>
          <h1 className="text-2xl font-bold">请求详情</h1>
          <p className="text-gray-500 mt-1 font-mono text-sm">{request.id}</p>
        </div>
      </div>

      {/* 基本信息 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-500/10 text-primary-400 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">时间</p>
              <p className="font-mono text-sm">{formatTime(request.timestamp)}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success-500/10 text-success-400 rounded-lg">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">模型</p>
              <p className="font-semibold">{request.model}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-warning-500/10 text-warning-400 rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">成本</p>
              <p className="font-mono">${request.cost_usd.toFixed(4)}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-danger-500/10 text-danger-400 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">状态</p>
              <p className={request.is_error ? 'text-danger-400' : 'text-success-400'}>
                {request.status_code} {request.is_error ? '错误' : '成功'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Token 和延迟 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <h3 className="text-sm text-gray-500 mb-3">Token 用量</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">输入</span>
              <span className="font-mono">{request.input_tokens.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">输出</span>
              <span className="font-mono">{request.output_tokens.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-t border-gray-800 pt-2">
              <span className="text-gray-400">总计</span>
              <span className="font-mono font-semibold">{request.total_tokens.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-sm text-gray-500 mb-3">延迟</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">总延迟</span>
              <span className="font-mono">{formatLatency(request.latency_ms)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">首 Token</span>
              <span className="font-mono">{formatLatency(request.ttft_ms)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">流式</span>
              <span>{request.stream ? '是' : '否'}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-sm text-gray-500 mb-3">元数据</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">提供商</span>
              <span>{request.provider || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">用户</span>
              <span>{request.user_id || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Trace ID</span>
              <span className="font-mono text-xs">{request.trace_id || '-'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 请求内容 */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">请求内容</h3>
          <button
            onClick={() => copyToClipboard(request.request_body || '', 'request')}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200"
          >
            <Copy className="w-4 h-4" />
            {copied === 'request' ? '已复制' : '复制'}
          </button>
        </div>
        <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto text-sm font-mono max-h-96 overflow-y-auto">
          {request.request_body || '无内容'}
        </pre>
      </div>

      {/* 响应内容 */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">响应内容</h3>
          <button
            onClick={() => copyToClipboard(request.response_body || '', 'response')}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200"
          >
            <Copy className="w-4 h-4" />
            {copied === 'response' ? '已复制' : '复制'}
          </button>
        </div>
        <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto text-sm font-mono max-h-96 overflow-y-auto">
          {request.response_body || '无内容'}
        </pre>
      </div>

      {/* 错误信息 */}
      {request.is_error && request.error_message && (
        <div className="card border-danger-500/30">
          <h3 className="text-lg font-semibold text-danger-400 mb-4">错误信息</h3>
          <pre className="bg-danger-500/10 p-4 rounded-lg overflow-x-auto text-sm font-mono">
            {request.error_message}
          </pre>
        </div>
      )}
    </div>
  )
}
