'use client'

import { 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts'

interface DataPoint {
  name: string
  value: number
  color?: string
}

interface PieChartProps {
  data: DataPoint[]
  title: string
  height?: number
  formatValue?: (value: number) => string
  showLegend?: boolean
  colors?: string[]
}

const defaultColors = [
  '#0ea5e9', // primary
  '#22c55e', // success
  '#f59e0b', // warning
  '#ef4444', // danger
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
]

export function PieChart({ 
  data, 
  title, 
  height = 200,
  formatValue = (v) => v.toString(),
  showLegend = true,
  colors = defaultColors
}: PieChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="card h-full">
      <h3 className="text-sm font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color || colors[index % colors.length]} 
              />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1f2937', 
              border: '1px solid #374151',
              borderRadius: '0.5rem'
            }}
            formatter={(value: number, name: string) => [
              formatValue(value),
              name
            ]}
          />
          {showLegend && (
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value) => <span style={{ color: '#9ca3af' }}>{value}</span>}
            />
          )}
        </RechartsPieChart>
      </ResponsiveContainer>
      <div className="text-center mt-2">
        <span className="text-2xl font-bold">{formatValue(total)}</span>
        <span className="text-sm text-gray-500 ml-2">总计</span>
      </div>
    </div>
  )
}
