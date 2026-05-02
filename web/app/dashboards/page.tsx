'use client'

import { useState, useEffect } from 'react'
import { Responsive, WidthProvider } from 'react-grid-layout'
import { 
  Plus,
  Save,
  Trash2,
  Settings,
  Layout,
  Grid3X3,
  Maximize2,
  Minimize2
} from 'lucide-react'
import { 
  WidgetConfig, 
  WidgetType, 
  createWidget, 
  getWidgetComponent,
  dashboardTemplates 
} from '@/components/dashboard/WidgetRegistry'

import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

const ResponsiveGridLayout = WidthProvider(Responsive)

export default function DashboardPage() {
  const [widgets, setWidgets] = useState<WidgetConfig[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [showWidgetMenu, setShowWidgetMenu] = useState(false)
  const [showTemplateMenu, setShowTemplateMenu] = useState(false)
  const [dashboardName, setDashboardName] = useState('我的看板')
  const [isFullscreen, setIsFullscreen] = useState(false)

  // 加载默认模板
  useEffect(() => {
    loadTemplate('personal')
  }, [])

  const loadTemplate = (templateName: keyof typeof dashboardTemplates) => {
    const template = dashboardTemplates[templateName]
    if (template) {
      setWidgets(template.widgets)
      setDashboardName(template.name)
      setShowTemplateMenu(false)
    }
  }

  const addWidget = (type: WidgetType) => {
    const newWidget = createWidget(type, {
      y: Math.max(...widgets.map(w => w.y + w.h), 0),
    })
    setWidgets([...widgets, newWidget])
    setShowWidgetMenu(false)
    setIsEditing(true)
  }

  const removeWidget = (id: string) => {
    setWidgets(widgets.filter(w => w.id !== id))
  }

  const updateWidgetLayout = (layout: any[]) => {
    const updatedWidgets = widgets.map(widget => {
      const layoutItem = layout.find(l => l.i === widget.id)
      if (layoutItem) {
        return {
          ...widget,
          x: layoutItem.x,
          y: layoutItem.y,
          w: layoutItem.w,
          h: layoutItem.h,
        }
      }
      return widget
    })
    setWidgets(updatedWidgets)
  }

  const saveDashboard = () => {
    // TODO: 保存到后端
    const dashboardData = {
      name: dashboardName,
      widgets,
      updatedAt: new Date().toISOString(),
    }
    console.log('Saving dashboard:', dashboardData)
    setIsEditing(false)
    alert('看板已保存！')
  }

  const clearDashboard = () => {
    if (confirm('确定要清空看板吗？')) {
      setWidgets([])
      setIsEditing(true)
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  // 布局配置
  const layouts = {
    lg: widgets.map(w => ({
      i: w.id,
      x: w.x,
      y: w.y,
      w: w.w,
      h: w.h,
      minW: 2,
      minH: 2,
    })),
  }

  return (
    <div className="p-6 space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {isEditing ? (
            <input
              type="text"
              value={dashboardName}
              onChange={(e) => setDashboardName(e.target.value)}
              className="text-2xl font-bold bg-transparent border-b-2 border-primary-500 focus:outline-none"
            />
          ) : (
            <h1 className="text-2xl font-bold">{dashboardName}</h1>
          )}
          <span className="text-sm text-gray-500">
            {widgets.length} 个组件
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* 模板选择 */}
          <div className="relative">
            <button
              onClick={() => setShowTemplateMenu(!showTemplateMenu)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
            >
              <Layout className="w-4 h-4" />
              模板
            </button>
            {showTemplateMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-50">
                {Object.entries(dashboardTemplates).map(([key, template]) => (
                  <button
                    key={key}
                    onClick={() => loadTemplate(key as keyof typeof dashboardTemplates)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-700 transition-colors first:rounded-t-lg last:rounded-b-lg"
                  >
                    <div className="font-semibold">{template.name}</div>
                    <div className="text-xs text-gray-500">{template.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 添加组件 */}
          <div className="relative">
            <button
              onClick={() => setShowWidgetMenu(!showWidgetMenu)}
              className="flex items-center gap-2 px-3 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              添加组件
            </button>
            {showWidgetMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-50 max-h-96 overflow-y-auto">
                <div className="p-2 grid grid-cols-2 gap-2">
                  {[
                    { type: 'number_card', label: '数字卡片', icon: '📊' },
                    { type: 'line_chart', label: '折线图', icon: '📈' },
                    { type: 'bar_chart', label: '柱状图', icon: '📊' },
                    { type: 'pie_chart', label: '饼图', icon: '🥧' },
                    { type: 'table', label: '表格', icon: '📋' },
                    { type: 'heatmap', label: '热力图', icon: '🔥' },
                    { type: 'ranking', label: '排行榜', icon: '🏆' },
                    { type: 'timeline', label: '时间线', icon: '⏱️' },
                    { type: 'alert_stream', label: '告警流', icon: '🚨' },
                    { type: 'status_light', label: '状态灯', icon: '💡' },
                    { type: 'markdown', label: 'Markdown', icon: '📝' },
                    { type: 'iframe', label: 'iframe', icon: '🌐' },
                  ].map(({ type, label, icon }) => (
                    <button
                      key={type}
                      onClick={() => addWidget(type as WidgetType)}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-gray-700 rounded-lg transition-colors text-sm"
                    >
                      <span>{icon}</span>
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 全屏 */}
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            title={isFullscreen ? '退出全屏' : '全屏显示'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* 编辑模式 */}
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`px-3 py-2 rounded-lg text-sm transition-colors ${
              isEditing 
                ? 'bg-primary-600 text-white' 
                : 'bg-gray-800 hover:bg-gray-700'
            }`}
          >
            {isEditing ? '完成编辑' : '编辑'}
          </button>

          {/* 保存 */}
          {isEditing && (
            <button
              onClick={saveDashboard}
              className="flex items-center gap-2 px-3 py-2 bg-success-600 hover:bg-success-700 rounded-lg text-sm transition-colors"
            >
              <Save className="w-4 h-4" />
              保存
            </button>
          )}

          {/* 清空 */}
          <button
            onClick={clearDashboard}
            className="p-2 bg-gray-800 hover:bg-danger-600 rounded-lg transition-colors"
            title="清空看板"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 看板内容 */}
      {widgets.length === 0 ? (
        <div className="card text-center py-20">
          <Grid3X3 className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <h2 className="text-xl font-semibold mb-2">看板为空</h2>
          <p className="text-gray-500 mb-6">点击"添加组件"开始构建你的看板</p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => loadTemplate('personal')}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
            >
              使用个人模板
            </button>
            <button
              onClick={() => loadTemplate('team')}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              使用团队模板
            </button>
          </div>
        </div>
      ) : (
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4 }}
          rowHeight={50}
          isDraggable={isEditing}
          isResizable={isEditing}
          onLayoutChange={(layout) => updateWidgetLayout(layout)}
          draggableHandle=".drag-handle"
        >
          {widgets.map((widget) => {
            const WidgetComponent = getWidgetComponent(widget.type)
            return (
              <div key={widget.id} className="relative group">
                {/* 拖拽手柄 */}
                {isEditing && (
                  <div className="drag-handle absolute top-0 left-0 right-0 h-8 cursor-move z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-8 h-1 bg-gray-500 rounded"></div>
                  </div>
                )}
                
                {/* 删除按钮 */}
                {isEditing && (
                  <button
                    onClick={() => removeWidget(widget.id)}
                    className="absolute top-2 right-2 p-1 bg-danger-600 hover:bg-danger-700 rounded opacity-0 group-hover:opacity-100 transition-opacity z-20"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}

                {/* Widget 内容 */}
                <div className="h-full overflow-hidden">
                  <WidgetComponent {...widget.config} />
                </div>
              </div>
            )
          })}
        </ResponsiveGridLayout>
      )}

      {/* 编辑提示 */}
      {isEditing && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 px-4 py-2 rounded-lg shadow-lg border border-gray-700">
          <p className="text-sm text-gray-400">
            🎨 编辑模式：拖拽组件调整位置，拖拽边缘调整大小
          </p>
        </div>
      )}
    </div>
  )
}
