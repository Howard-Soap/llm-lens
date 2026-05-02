'use client'

import { useState, useEffect } from 'react'
import { 
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react'

interface ModelCost {
  model: string
  total_cost_usd: number
  request_count: number
  avg_cost_usd: number
}

interface TimeCost {
  timestamp: string
  total_cost_usd: number
  request_count: number
}

interface UserCost {
  user_id: string
  total_cost_usd: number
  request_count: number
}

interface CostData {
  by_model: ModelCost[]
  by_time: TimeCost[]
  by_user: UserCost[]
}

export default function CostsPage() {
  const [costData, setCostData] = useState<CostData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('7d')

  useEffect(() => {
    fetchCosts()
  }, [timeRange])

  const fetchCosts = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/costs?time_range=${timeRange}`)
      if (response.ok) {
        const data = await response.json()
        setCostData(data)
      }
    } catch (error) {
      console.error('Failed to fetch costs:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalCost = costData?.by_model?.reduce((sum, m) => sum + m.total_cost_usd, 0) || 0
  const totalRequests = costData?.by_model?.reduce((sum, m) => sum + m.request_count, 0) || 0
  const avgCostPerRequest = totalRequests > 0 ? totalCost / totalRequests : 0

  const formatCost = (cost: number) => {
    if (cost < 0.01) return `$${cost.toFixed(4)}`
    if (cost < 1) return `$${cost.toFixed(3)}`
    return `$${cost.toFixed(2)}`
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  // 计算成本占比
  const modelPercentages = costData?.by_model?.map(m => ({
    ...m,
    percentage: totalCost > 0 ? (m.total_cost_usd / totalCost) * 100 : 0
  })) || []

  // 颜色映射
  const colors = [
    'bg-primary-500',
    'bg-success-500',
    'bg-warning-500',
    'bg-danger-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
  ]

  return (
    <div className="p-6 space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">成本分析</h1>
          <p className="text-gray-500 mt-1">按模型、时间、用户维度分析 LLM 费用</p>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
          >
            <option value="24h">最近 24 小时</option>
            <option value="7d">最近 7 天</option>
            <option value="30d">最近 30 天</option>
          </select>
          <button 
            onClick={fetchCosts}
            className="bg-primary-600 hover:bg-primary-700 px-4 py-2 rounded-lg text-sm transition-colors"
          >
            刷新
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">总成本</p>
              <p className="text-2xl font-bold mt-1">
                {loading ? '-' : formatCost(totalCost)}
              </p>
            </div>
            <div className="p-3 bg-success-500/10 text-success-400 rounded-lg">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">总请求数</p>
              <p className="text-2xl font-bold mt-1">
                {loading ? '-' : formatNumber(totalRequests)}
              </p>
            </div>
            <div className="p-3 bg-primary-500/10 text-primary-400 rounded-lg">
              <Activity className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">平均成本/请求</p>
              <p className="text-2xl font-bold mt-1">
                {loading ? '-' : formatCost(avgCostPerRequest)}
              </p>
            </div>
            <div className="p-3 bg-warning-500/10 text-warning-400 rounded-lg">
              <BarChart3 className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* 按模型分布 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-primary-400" />
            按模型分布
          </h3>
          
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full"></div>
            </div>
          ) : modelPercentages.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <PieChart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>暂无数据</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {modelPercentages.map((model, index) => (
                <div key={model.model} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`}></div>
                      <span className="font-mono text-sm">{model.model}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-sm">{formatCost(model.total_cost_usd)}</span>
                      <span className="text-gray-500 text-xs ml-2">
                        ({model.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div 
                      className={`${colors[index % colors.length]} h-2 rounded-full transition-all duration-500`}
                      style={{ width: `${model.percentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{formatNumber(model.request_count)} 请求</span>
                    <span>平均 {formatCost(model.avg_cost_usd)}/次</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 按时间趋势 */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-400" />
            成本趋势
          </h3>
          
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full"></div>
            </div>
          ) : costData?.by_time?.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>暂无数据</p>
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-end justify-between gap-2 px-4">
              {costData?.by_time?.map((day, index) => {
                const maxCost = Math.max(...(costData?.by_time?.map(d => d.total_cost_usd) || [0]))
                const height = maxCost > 0 ? (day.total_cost_usd / maxCost) * 100 : 0
                const date = new Date(day.timestamp)
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div className="text-xs text-gray-500 font-mono">
                      {formatCost(day.total_cost_usd)}
                    </div>
                    <div className="w-full bg-gray-800 rounded-t" style={{ height: '200px' }}>
                      <div 
                        className="w-full bg-primary-500 rounded-t transition-all duration-500"
                        style={{ height: `${height}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {date.getMonth() + 1}/{date.getDate()}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* 按用户分布 */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary-400" />
          按用户分布（Top 10）
        </h3>
        
        {loading ? (
          <div className="h-32 flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full"></div>
          </div>
        ) : costData?.by_user?.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>暂无用户数据</p>
              <p className="text-sm mt-1">请求中需要包含 user_id 字段</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-auto">
              <thead>
                <tr>
                  <th>排名</th>
                  <th>用户 ID</th>
                  <th>总成本</th>
                  <th>请求数</th>
                  <th>平均成本</th>
                  <th>占比</th>
                </tr>
              </thead>
              <tbody>
                {costData?.by_user?.map((user, index) => {
                  const percentage = totalCost > 0 ? (user.total_cost_usd / totalCost) * 100 : 0
                  const avgCost = user.request_count > 0 ? user.total_cost_usd / user.request_count : 0
                  
                  return (
                    <tr key={user.user_id} className="hover:bg-gray-800/50">
                      <td>
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${
                          index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                          index === 1 ? 'bg-gray-400/20 text-gray-400' :
                          index === 2 ? 'bg-orange-500/20 text-orange-400' :
                          'bg-gray-700 text-gray-500'
                        }`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="font-mono text-sm">{user.user_id}</td>
                      <td className="font-mono text-sm">{formatCost(user.total_cost_usd)}</td>
                      <td className="text-sm">{formatNumber(user.request_count)}</td>
                      <td className="font-mono text-sm">{formatCost(avgCost)}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-800 rounded-full h-2">
                            <div 
                              className="bg-primary-500 h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-500 w-12">
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 预算告警（TODO） */}
      <div className="card border-warning-500/30">
        <h3 className="text-lg font-semibold mb-4 text-warning-400">💡 预算告警</h3>
        <p className="text-gray-400">
          设置月度预算，当成本接近或超过预算时收到告警通知。
        </p>
        <p className="text-sm text-gray-500 mt-2">
          此功能将在后续版本中实现...
        </p>
      </div>
    </div>
  )
}
