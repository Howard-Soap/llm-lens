'use client'

import { NumberCard } from './NumberCard'
import { LineChart } from './LineChart'
import { BarChart } from './BarChart'
import { PieChart } from './PieChart'

// Widget 类型定义
export type WidgetType = 
  | 'number_card'
  | 'line_chart'
  | 'bar_chart'
  | 'pie_chart'
  | 'table'
  | 'heatmap'
  | 'ranking'
  | 'timeline'
  | 'alert_stream'
  | 'status_light'
  | 'markdown'
  | 'iframe'

// Widget 配置
export interface WidgetConfig {
  id: string
  type: WidgetType
  title: string
  x: number
  y: number
  w: number
  h: number
  config: Record<string, any>
}

// Widget 组件映射
const widgetComponents: Record<WidgetType, React.ComponentType<any>> = {
  number_card: NumberCard,
  line_chart: LineChart,
  bar_chart: BarChart,
  pie_chart: PieChart,
  table: () => <div className="card h-full">表格组件（TODO）</div>,
  heatmap: () => <div className="card h-full">热力图组件（TODO）</div>,
  ranking: () => <div className="card h-full">排行榜组件（TODO）</div>,
  timeline: () => <div className="card h-full">时间线组件（TODO）</div>,
  alert_stream: () => <div className="card h-full">告警流组件（TODO）</div>,
  status_light: () => <div className="card h-full">状态灯组件（TODO）</div>,
  markdown: () => <div className="card h-full">Markdown 组件（TODO）</div>,
  iframe: () => <div className="card h-full">iframe 组件（TODO）</div>,
}

// 获取 Widget 组件
export function getWidgetComponent(type: WidgetType) {
  return widgetComponents[type] || (() => <div className="card h-full">未知组件</div>)
}

// Widget 默认配置
export const widgetDefaults: Record<WidgetType, Partial<WidgetConfig>> = {
  number_card: {
    w: 3,
    h: 2,
    config: {
      title: '数字卡片',
      value: '0',
      icon: 'activity',
      color: 'primary',
    },
  },
  line_chart: {
    w: 6,
    h: 4,
    config: {
      title: '折线图',
      color: '#0ea5e9',
      showGrid: true,
    },
  },
  bar_chart: {
    w: 6,
    h: 4,
    config: {
      title: '柱状图',
      showGrid: true,
    },
  },
  pie_chart: {
    w: 4,
    h: 4,
    config: {
      title: '饼图',
      showLegend: true,
    },
  },
  table: {
    w: 12,
    h: 4,
    config: {
      title: '表格',
    },
  },
  heatmap: {
    w: 6,
    h: 4,
    config: {
      title: '热力图',
    },
  },
  ranking: {
    w: 4,
    h: 4,
    config: {
      title: '排行榜',
    },
  },
  timeline: {
    w: 6,
    h: 4,
    config: {
      title: '时间线',
    },
  },
  alert_stream: {
    w: 6,
    h: 4,
    config: {
      title: '告警流',
    },
  },
  status_light: {
    w: 3,
    h: 2,
    config: {
      title: '状态灯',
    },
  },
  markdown: {
    w: 6,
    h: 4,
    config: {
      title: 'Markdown',
      content: '# 标题\n\n这是 Markdown 内容',
    },
  },
  iframe: {
    w: 6,
    h: 4,
    config: {
      title: 'iframe',
      url: 'https://example.com',
    },
  },
}

// 创建新 Widget
export function createWidget(type: WidgetType, overrides?: Partial<WidgetConfig>): WidgetConfig {
  const defaults = widgetDefaults[type]
  return {
    id: `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    x: 0,
    y: 0,
    ...defaults,
    ...overrides,
  } as WidgetConfig
}

// 预设看板模板
export const dashboardTemplates = {
  personal: {
    name: '个人看板',
    description: '适合独立开发者的默认看板',
    widgets: [
      createWidget('number_card', { 
        title: '总请求数', 
        x: 0, y: 0, w: 3, h: 2,
        config: { title: '总请求数', value: '0', icon: 'activity', color: 'primary' }
      }),
      createWidget('number_card', { 
        title: '总成本', 
        x: 3, y: 0, w: 3, h: 2,
        config: { title: '总成本', value: '$0.00', icon: 'dollar', color: 'success' }
      }),
      createWidget('number_card', { 
        title: '平均延迟', 
        x: 6, y: 0, w: 3, h: 2,
        config: { title: '平均延迟', value: '0ms', icon: 'clock', color: 'warning' }
      }),
      createWidget('number_card', { 
        title: '错误率', 
        x: 9, y: 0, w: 3, h: 2,
        config: { title: '错误率', value: '0%', icon: 'alert', color: 'danger' }
      }),
      createWidget('line_chart', { 
        title: '成本趋势', 
        x: 0, y: 2, w: 8, h: 4,
        config: { title: '成本趋势（7天）', color: '#22c55e' }
      }),
      createWidget('pie_chart', { 
        title: '模型分布', 
        x: 8, y: 2, w: 4, h: 4,
        config: { title: '模型分布' }
      }),
    ],
  },
  team: {
    name: '团队看板',
    description: '适合小团队的协作看板',
    widgets: [
      createWidget('number_card', { 
        title: '总请求数', 
        x: 0, y: 0, w: 3, h: 2,
        config: { title: '总请求数', value: '0', icon: 'activity', color: 'primary' }
      }),
      createWidget('number_card', { 
        title: '总成本', 
        x: 3, y: 0, w: 3, h: 2,
        config: { title: '总成本', value: '$0.00', icon: 'dollar', color: 'success' }
      }),
      createWidget('number_card', { 
        title: '成员数', 
        x: 6, y: 0, w: 3, h: 2,
        config: { title: '成员数', value: '0', icon: 'activity', color: 'primary' }
      }),
      createWidget('number_card', { 
        title: '活跃度', 
        x: 9, y: 0, w: 3, h: 2,
        config: { title: '活跃度', value: '高', icon: 'activity', color: 'success' }
      }),
      createWidget('bar_chart', { 
        title: '成员贡献', 
        x: 0, y: 2, w: 6, h: 4,
        config: { title: '成员贡献排行' }
      }),
      createWidget('line_chart', { 
        title: '成本趋势', 
        x: 6, y: 2, w: 6, h: 4,
        config: { title: '成本趋势（7天）', color: '#22c55e' }
      }),
    ],
  },
  enterprise: {
    name: '企业大屏',
    description: '适合投屏展示的监控大屏',
    widgets: [
      createWidget('number_card', { 
        title: '总请求数', 
        x: 0, y: 0, w: 4, h: 3,
        config: { title: '总请求数', value: '1.2M', icon: 'activity', color: 'primary' }
      }),
      createWidget('number_card', { 
        title: '总成本', 
        x: 4, y: 0, w: 4, h: 3,
        config: { title: '总成本', value: '$12,345', icon: 'dollar', color: 'success' }
      }),
      createWidget('number_card', { 
        title: '活跃项目', 
        x: 8, y: 0, w: 4, h: 3,
        config: { title: '活跃项目', value: '8', icon: 'activity', color: 'primary' }
      }),
      createWidget('line_chart', { 
        title: '全局请求趋势', 
        x: 0, y: 3, w: 8, h: 5,
        config: { title: '全局请求趋势（24h）', color: '#0ea5e9' }
      }),
      createWidget('bar_chart', { 
        title: '项目成本排行', 
        x: 8, y: 3, w: 4, h: 5,
        config: { title: '项目成本排行' }
      }),
    ],
  },
}
