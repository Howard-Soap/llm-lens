'use client'

import { useState, useEffect } from 'react'
import { 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Clock,
  AlertTriangle
} from 'lucide-react'

interface NumberCardProps {
  title: string
  value: string
  change?: number
  icon: 'dollar' | 'activity' | 'clock' | 'alert'
  color?: 'primary' | 'success' | 'warning' | 'danger'
}

export function NumberCard({ title, value, change, icon, color = 'primary' }: NumberCardProps) {
  const iconMap = {
    dollar: DollarSign,
    activity: Activity,
    clock: Clock,
    alert: AlertTriangle,
  }

  const colorMap = {
    primary: {
      bg: 'bg-primary-500/10',
      text: 'text-primary-400',
    },
    success: {
      bg: 'bg-success-500/10',
      text: 'text-success-400',
    },
    warning: {
      bg: 'bg-warning-500/10',
      text: 'text-warning-400',
    },
    danger: {
      bg: 'bg-danger-500/10',
      text: 'text-danger-400',
    },
  }

  const Icon = iconMap[icon]
  const colors = colorMap[color]

  return (
    <div className="card h-full">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {change >= 0 ? (
                <TrendingUp className="w-4 h-4 text-success-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-danger-400" />
              )}
              <span className={`text-sm ${change >= 0 ? 'text-success-400' : 'text-danger-400'}`}>
                {Math.abs(change).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
        <div className={`${colors.bg} ${colors.text} p-3 rounded-lg`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}
