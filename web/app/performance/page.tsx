'use client'

import { useState, useEffect } from 'react'
import { 
  Zap,
  Clock,
  AlertTriangle,
  Activity,
  TrendingUp,
  Gauge
} from 'lucide-react'

interface PerformanceData {
  latency_p50: number
  latency_p95: number
  latency_p99: number
  avg_latency: number
  error_rate: number
  ttft_p50: number
  ttft_p95: number
}

export default function PerformancePage() {
  const [perfData, setPerfData] = useState<PerformanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('24h')

  useEffect(() => {
    fetchPerformance()
  }, [timeRange])

  const fetchPerformance = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/performance?time_range=${timeRange}`)
      if (response.ok) {
        const data = await response.json()
        setPerfData(data)
      }
    } catch (error) {
      console.error('Failed to fetch performance:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatLatency = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const getLatencyColor = (ms: number) => {
    if (ms < 200) return 'text-success-400'
    if (ms < 500) return 'text-warning-400'
    return 'text-danger-400'
  }

  const getLatencyBgColor = (ms: number) => {
    if (ms < 200) return 'bg-success-500/10'
    if (ms < 500) return 'bg-warning-500/10'
    return 'bg-danger-500/10'
  }

  const getErrorRateColor = (rate: number) => {
    if (rate < 1) return 'text-success-400'
    if (rate < 5) return 'text-warning-400'
    return 'text-danger-400'
  }

  return (
    <div className="p-6 space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">性能分析</h1>
          <p className="text-gray-500 mt-1">延迟分布、错误率、TTFT 等性能指标</p>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
          >
            <option value="1h">最近 1 小时</option>
            <option value="24h">最近 24 小时</option>
            <option value="7d">最近 7 天</option>
          </select>
          <button 
            onClick={fetchPerformance}
            className="bg-primary-600 hover:bg-primary-700 px-4 py-2 rounded-lg text-sm transition-colors"
          >
            刷新
          </button>
        </div>
      </div>

      {/* 延迟统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">平均延迟</p>
              <p className={`text-2xl font-bold mt-1 ${loading ? 'text-gray-500' : getLatencyColor(perfData?.avg_latency || 0)}`}>
                {loading ? '-' : formatLatency(perfData?.avg_latency || 0)}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${loading ? 'bg-gray-700' : getLatencyBgColor(perfData?.avg_latency || 0)}`}>
              <Clock className={`w-6 h-6 ${loading ? 'text-gray-500' : getLatencyColor(perfData?.avg_latency || 0)}`} />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            所有请求的平均响应时间
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">P50 延迟</p>
              <p className={`text-2xl font-bold mt-1 ${loading ? 'text-gray-500' : getLatencyColor(perfData?.latency_p50 || 0)}`}>
                {loading ? '-' : formatLatency(perfData?.latency_p50 || 0)}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${loading ? 'bg-gray-700' : getLatencyBgColor(perfData?.latency_p50 || 0)}`}>
              <Gauge className={`w-6 h-6 ${loading ? 'text-gray-500' : getLatencyColor(perfData?.latency_p50 || 0)}`} />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            50% 的请求在此延迟内完成
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">P95 延迟</p>
              <p className={`text-2xl font-bold mt-1 ${loading ? 'text-gray-500' : getLatencyColor(perfData?.latency_p95 || 0)}`}>
                {loading ? '-' : formatLatency(perfData?.latency_p95 || 0)}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${loading ? 'bg-gray-700' : getLatencyBgColor(perfData?.latency_p95 || 0)}`}>
              <TrendingUp className={`w-6 h-6 ${loading ? 'text-gray-500' : getLatencyColor(perfData?.latency_p95 || 0)}`} />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            95% 的请求在此延迟内完成
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">错误率</p>
              <p className={`text-2xl font-bold mt-1 ${loading ? 'text-gray-500' : getErrorRateColor(perfData?.error_rate || 0)}`}>
                {loading ? '-' : `${(perfData?.error_rate || 0).toFixed(2)}%`}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${loading ? 'bg-gray-700' : 'bg-danger-500/10'}`}>
              <AlertTriangle className={`w-6 h-6 ${loading ? 'text-gray-500' : getErrorRateColor(perfData?.error_rate || 0)}`} />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            请求失败的比例
          </div>
        </div>
      </div>

      {/* 延迟分布图 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary-400" />
            延迟分布
          </h3>
          
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* P50 */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-400">P50（中位数）</span>
                  <span className={`font-mono text-sm ${getLatencyColor(perfData?.latency_p50 || 0)}`}>
                    {formatLatency(perfData?.latency_p50 || 0)}
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-4">
                  <div 
                    className="bg-success-500 h-4 rounded-full transition-all duration-500"
                    style={{ width: '50%' }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  一半的请求比这个快
                </div>
              </div>

              {/* P95 */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-400">P95</span>
                  <span className={`font-mono text-sm ${getLatencyColor(perfData?.latency_p95 || 0)}`}>
                    {formatLatency(perfData?.latency_p95 || 0)}
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-4">
                  <div 
                    className="bg-warning-500 h-4 rounded-full transition-all duration-500"
                    style={{ width: '95%' }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  95% 的请求比这个快
                </div>
              </div>

              {/* P99 */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-400">P99</span>
                  <span className={`font-mono text-sm ${getLatencyColor(perfData?.latency_p99 || 0)}`}>
                    {formatLatency(perfData?.latency_p99 || 0)}
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-4">
                  <div 
                    className="bg-danger-500 h-4 rounded-full transition-all duration-500"
                    style={{ width: '99%' }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  99% 的请求比这个快
                </div>
              </div>
            </div>
          )}
        </div>

        {/* TTFT 分析 */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-warning-400" />
            首 Token 延迟（TTFT）
          </h3>
          
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center py-8">
                <div className="text-5xl font-bold text-primary-400 mb-2">
                  {formatLatency(perfData?.ttft_p50 || 0)}
                </div>
                <div className="text-gray-500">P50 首 Token 延迟</div>
                <div className="text-sm text-gray-600 mt-1">
                  用户感知到的首次响应时间
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-success-400">
                    {formatLatency(perfData?.ttft_p50 || 0)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">P50</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-warning-400">
                    {formatLatency(perfData?.ttft_p95 || 0)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">P95</div>
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4">
                <h4 className="text-sm font-semibold mb-2">为什么 TTFT 很重要？</h4>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• 用户感知到的响应速度主要取决于 TTFT</li>
                  <li>• 流式响应场景下，TTFT 比总延迟更重要</li>
                  <li>• TTFT 高可能表示模型负载高或网络延迟大</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 错误率分析 */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-danger-400" />
          错误率分析
        </h3>
        
        {loading ? (
          <div className="h-32 flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800 rounded-lg p-6 text-center">
              <div className={`text-4xl font-bold mb-2 ${getErrorRateColor(perfData?.error_rate || 0)}`}>
                {(perfData?.error_rate || 0).toFixed(2)}%
              </div>
              <div className="text-gray-500">当前错误率</div>
              <div className="mt-4">
                {(perfData?.error_rate || 0) < 1 ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-success-500/10 text-success-400">
                    <span className="w-2 h-2 rounded-full bg-success-500"></span>
                    健康
                  </span>
                ) : (perfData?.error_rate || 0) < 5 ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-warning-500/10 text-warning-400">
                    <span className="w-2 h-2 rounded-full bg-warning-500"></span>
                    警告
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-danger-500/10 text-danger-400">
                    <span className="w-2 h-2 rounded-full bg-danger-500"></span>
                    危险
                  </span>
                )}
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h4 className="text-sm text-gray-500 mb-4">错误率阈值</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">健康</span>
                  <span className="text-sm text-success-400">&lt; 1%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">警告</span>
                  <span className="text-sm text-warning-400">1% - 5%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">危险</span>
                  <span className="text-sm text-danger-400">&gt; 5%</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h4 className="text-sm text-gray-500 mb-4">建议</h4>
              <ul className="text-sm text-gray-400 space-y-2">
                {(perfData?.error_rate || 0) < 1 ? (
                  <>
                    <li>✓ 错误率正常</li>
                    <li>✓ 继续监控</li>
                    <li>✓ 可以考虑降低告警阈值</li>
                  </>
                ) : (perfData?.error_rate || 0) < 5 ? (
                  <>
                    <li>⚠ 检查最近的错误日志</li>
                    <li>⚠ 确认 API Key 是否有效</li>
                    <li>⚠ 检查模型是否可用</li>
                  </>
                ) : (
                  <>
                    <li>🚨 立即检查错误原因</li>
                    <li>🚨 可能是 API 限流或配额耗尽</li>
                    <li>🚨 考虑切换到备用模型</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* 性能优化建议 */}
      <div className="card border-primary-500/30">
        <h3 className="text-lg font-semibold mb-4 text-primary-400">💡 性能优化建议</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold mb-2">降低延迟</h4>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• 使用更快的模型（如 GPT-4o-mini）</li>
              <li>• 减少 max_tokens 参数</li>
              <li>• 使用流式响应（stream=true）</li>
              <li>• 优化 prompt 长度</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">降低成本</h4>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• 使用更便宜的模型（如 DeepSeek）</li>
              <li>• 减少不必要的 token 消耗</li>
              <li>• 实现请求缓存</li>
              <li>• 设置 max_tokens 限制</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
