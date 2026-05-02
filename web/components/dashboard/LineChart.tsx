'use client'

import { 
  LineChart as RechartsLineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts'

interface DataPoint {
  timestamp: string
  value: number
  label?: string
}

interface LineChartProps {
  data: DataPoint[]
  title: string
  color?: string
  height?: number
  showGrid?: boolean
  formatValue?: (value: number) => string
}

export function LineChart({ 
  data, 
  title, 
  color = '#0ea5e9',
  height = 200,
  showGrid = true,
  formatValue = (v) => v.toString()
}: LineChartProps) {
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  return (
    <div className="card h-full">
      <h3 className="text-sm font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsLineChart data={data}>
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          )}
          <XAxis 
            dataKey="timestamp" 
            tickFormatter={formatDate}
            stroke="#6b7280"
            fontSize={12}
          />
          <YAxis 
            tickFormatter={formatValue}
            stroke="#6b7280"
            fontSize={12}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1f2937', 
              border: '1px solid #374151',
              borderRadius: '0.5rem'
            }}
            labelStyle={{ color: '#9ca3af' }}
            formatter={(value: number) => [formatValue(value), title]}
          />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={2}
            dot={{ fill: color, strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  )
}
