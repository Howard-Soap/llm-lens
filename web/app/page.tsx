'use client'

import { useState, useEffect } from 'react'
import { 
  Activity, 
  DollarSign, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  TrendingDown
} from 'lucide-react'

interface OverviewData {
  total_requests: number
  total_cost_usd: number
  avg_latency_ms: number
  error_rate: number
  requests_change: number
  cost_change: number
  latency_change: number
  error_change: number
}

export default function Home() {
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOverview()
  }, [])

  const fetchOverview = async () => {
    try {
      const response = await fetch('/api/overview')
      if (response.ok) {
        const data = await response.json()
        setOverview(data)
      }
    } catch (error) {
      console.error('Failed to fetch overview:', error)
    } finally {
      setLoading(false)
    }
  }

  const stats = [
    {
      name: '总请求',
      value: overview?.total_requests?.toLocaleString() || '0',
      change: overview?.requests_change || 0,
      icon: Activity,
      color: 'text-primary-400',
      bgColor: 'bg-primary-500/10',
    },
    {
      name: '总成本',
      value: `$${overview?.total_cost_usd?.toFixed(2) || '0.00'}`,
      change: overview?.cost_change || 0,
      icon: DollarSign,
      color: 'text-success-400',
      bgColor: 'bg-success-500/10',
    },
    {
      name: '平均延迟',
      value: `${overview?.avg_latency_ms || 0}ms`,
      change: overview?.latency_change || 0,
      icon: Clock,
      color: 'text-warning-400',
      bgColor: 'bg-warning-500/10',
    },
    {
      name: '错误率',
      value: `${overview?.error_rate?.toFixed(1) || '0.0'}%`,
      change: overview?.error_change || 0,
      icon: AlertTriangle,
      color: 'text-danger-400',
      bgColor: 'bg-danger-500/10',
    },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">总览</h1>
          <p className="text-gray-500 mt-1">LLM 应用运行状态一目了然</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm">
            <option>最近 24 小时</option>
            <option>最近 7 天</option>
            <option>最近 30 天</option>
          </select>
          <button 
            onClick={fetchOverview}
            className="bg-primary-600 hover:bg-primary-700 px-4 py-2 rounded-lg text-sm transition-colors"
          >
            刷新
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.name} className="card animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.name}</p>
                <p className="text-2xl font-bold mt-1">{loading ? '-' : stat.value}</p>
                <div className="flex items-center gap-1 mt-2">
                  {stat.change >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-success-400" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-danger-400" />
                  )}
                  <span className={`text-sm ${stat.change >= 0 ? 'text-success-400' : 'text-danger-400'}`}>
                    {Math.abs(stat.change).toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className={`${stat.bgColor} ${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 成本趋势 */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">成本趋势</h3>
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>图表加载中...</p>
              <p className="text-sm mt-1">需要接入数据后显示</p>
            </div>
          </div>
        </div>

        {/* 模型分布 */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">模型分布</h3>
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>图表加载中...</p>
              <p className="text-sm mt-1">需要接入数据后显示</p>
            </div>
          </div>
        </div>
      </div>

      {/* 最近请求 */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">最近请求</h3>
          <a href="/requests" className="text-primary-400 hover:text-primary-300 text-sm">
            查看全部 →
          </a>
        </div>
        
        <div className="overflow-x-auto">
          <table className="table-auto">
            <thead>
              <tr>
                <th>时间</th>
                <th>模型</th>
                <th>Tokens</th>
                <th>成本</th>
                <th>延迟</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                    加载中...
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>暂无数据</p>
                    <p className="text-sm mt-1">接入 LLM API 后将显示请求记录</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 快速开始 */}
      <div className="card border-primary-500/30">
        <h3 className="text-lg font-semibold mb-4 text-primary-400">🚀 快速开始</h3>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-400 mb-2">1. 启动 LLM Lens</p>
            <code className="block bg-gray-800 p-3 rounded-lg text-sm font-mono">
              docker run -d --name llm-lens -p 3000:3000 llmlens/llm-lens:latest
            </code>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-2">2. 接入你的应用</p>
            <code className="block bg-gray-800 p-3 rounded-lg text-sm font-mono">
              {`import openai
client = openai.OpenAI(
    api_key="sk-your-key",
    base_url="http://localhost:3000/v1"  # ← 改这一行
)`}
            </code>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-2">3. 开始监控</p>
            <p className="text-sm text-gray-500">
              发送请求后，数据将自动显示在此 Dashboard 中
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
