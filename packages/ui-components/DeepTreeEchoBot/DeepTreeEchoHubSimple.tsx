import React, { useState } from 'react'

// Simple icon component replacement
const IconPlaceholder = ({
  size = 20,
  children,
}: {
  size?: number
  children?: React.ReactNode
}) => (
  <div
    className='inline-flex items-center justify-center'
    style={{ width: size, height: size, fontSize: Math.max(12, size * 0.6) }}
  >
    {children || '●'}
  </div>
)

const DeepTreeEchoHubSimple: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard')

  const TabButton = ({
    id,
    icon,
    label,
    isActive,
  }: {
    id: string
    icon: string
    label: string
    isActive: boolean
  }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 w-full text-left ${
        isActive
          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
          : 'hover:bg-gray-700/30 text-gray-400 hover:text-gray-300'
      }`}
      style={{
        backgroundColor: isActive ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
        color: isActive ? '#a5b4fc' : '#9ca3af',
        border: isActive
          ? '1px solid rgba(99, 102, 241, 0.3)'
          : '1px solid transparent',
      }}
    >
      <IconPlaceholder size={20}>{icon}</IconPlaceholder>
      <span>{label}</span>
    </button>
  )

  const DashboardView = () => (
    <div style={{ padding: '24px' }}>
      <h1
        style={{
          fontSize: '32px',
          fontWeight: 'bold',
          color: 'white',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
          }}
        >
          🌲
        </div>
        Deep Tree Echo Hub
      </h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
          marginBottom: '32px',
        }}
      >
        <div
          style={{
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '12px',
            padding: '24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
            }}
          >
            <IconPlaceholder size={24}>📊</IconPlaceholder>
            <span
              style={{
                fontSize: '12px',
                color: '#6366f1',
                background: 'rgba(99, 102, 241, 0.2)',
                padding: '4px 8px',
                borderRadius: '16px',
              }}
            >
              Active
            </span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'white' }}>
            3
          </div>
          <div style={{ fontSize: '14px', color: '#d1d5db' }}>
            Running Instances
          </div>
        </div>

        <div
          style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '12px',
            padding: '24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
            }}
          >
            <IconPlaceholder size={24}>💾</IconPlaceholder>
            <span
              style={{
                fontSize: '12px',
                color: '#10b981',
                background: 'rgba(16, 185, 129, 0.2)',
                padding: '4px 8px',
                borderRadius: '16px',
              }}
            >
              5.1 GB
            </span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'white' }}>
            847
          </div>
          <div style={{ fontSize: '14px', color: '#d1d5db' }}>
            Memory Fragments
          </div>
        </div>

        <div
          style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '12px',
            padding: '24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
            }}
          >
            <IconPlaceholder size={24}>💬</IconPlaceholder>
            <span
              style={{
                fontSize: '12px',
                color: '#f59e0b',
                background: 'rgba(245, 158, 11, 0.2)',
                padding: '4px 8px',
                borderRadius: '16px',
              }}
            >
              Live
            </span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'white' }}>
            25
          </div>
          <div style={{ fontSize: '14px', color: '#d1d5db' }}>
            Active Conversations
          </div>
        </div>

        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: '24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
            }}
          >
            <IconPlaceholder size={24}>🛡️</IconPlaceholder>
            <span
              style={{
                fontSize: '12px',
                color: '#ef4444',
                background: 'rgba(239, 68, 68, 0.2)',
                padding: '4px 8px',
                borderRadius: '16px',
              }}
            >
              Secure
            </span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'white' }}>
            100%
          </div>
          <div style={{ fontSize: '14px', color: '#d1d5db' }}>
            Session Security
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h2
          style={{
            fontSize: '20px',
            fontWeight: '600',
            color: 'white',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <IconPlaceholder size={20}>🌐</IconPlaceholder>
          Active Instances
        </h2>
        <div
          style={{
            background: 'rgba(31, 41, 55, 0.5)',
            border: '1px solid rgba(75, 85, 99, 0.5)',
            borderRadius: '12px',
            padding: '24px',
            textAlign: 'center',
          }}
        >
          <IconPlaceholder size={48}>🔄</IconPlaceholder>
          <h3
            style={{
              fontSize: '18px',
              fontWeight: '600',
              color: 'white',
              marginBottom: '8px',
              marginTop: '16px',
            }}
          >
            Instance Management
          </h3>
          <p style={{ color: '#9ca3af' }}>
            Deep Tree Echo instances will appear here when activated
          </p>
        </div>
      </div>

      <div>
        <h2
          style={{
            fontSize: '20px',
            fontWeight: '600',
            color: 'white',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <IconPlaceholder size={20}>🕒</IconPlaceholder>
          Recent Activity
        </h2>
        <div
          style={{
            background: 'rgba(31, 41, 55, 0.5)',
            border: '1px solid rgba(75, 85, 99, 0.5)',
            borderRadius: '12px',
            padding: '24px',
            textAlign: 'center',
          }}
        >
          <IconPlaceholder size={48}>📝</IconPlaceholder>
          <h3
            style={{
              fontSize: '18px',
              fontWeight: '600',
              color: 'white',
              marginBottom: '8px',
              marginTop: '16px',
            }}
          >
            Activity Monitor
          </h3>
          <p style={{ color: '#9ca3af' }}>
            Recent conversations and bot interactions will be shown here
          </p>
        </div>
      </div>
    </div>
  )

  const SettingsView = () => (
    <div style={{ padding: '24px' }}>
      <h1
        style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: 'white',
          marginBottom: '24px',
        }}
      >
        Deep Tree Echo Settings
      </h1>
      <div
        style={{
          background: 'rgba(31, 41, 55, 0.5)',
          border: '1px solid rgba(75, 85, 99, 0.5)',
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <IconPlaceholder size={48}>⚙️</IconPlaceholder>
        <h3
          style={{
            fontSize: '18px',
            fontWeight: '600',
            color: 'white',
            marginBottom: '8px',
            marginTop: '16px',
          }}
        >
          Advanced Configuration
        </h3>
        <p style={{ color: '#9ca3af' }}>
          Cognitive settings and AI configuration options coming soon
        </p>
      </div>
    </div>
  )

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#111827',
        color: 'white',
        display: 'flex',
      }}
    >
      {/* Sidebar */}
      <div
        style={{
          width: '256px',
          background: '#1f2937',
          borderRight: '1px solid #374151',
          padding: '24px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
            }}
          >
            🔊
          </div>
          <span style={{ fontWeight: '600' }}>Deep Tree Echo</span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <TabButton
            id='dashboard'
            icon='📊'
            label='Dashboard'
            isActive={activeTab === 'dashboard'}
          />
          <TabButton
            id='instances'
            icon='🖥️'
            label='Instances'
            isActive={activeTab === 'instances'}
          />
          <TabButton
            id='memory'
            icon='💾'
            label='Memory'
            isActive={activeTab === 'memory'}
          />
          <TabButton
            id='settings'
            icon='⚙️'
            label='Settings'
            isActive={activeTab === 'settings'}
          />
        </nav>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1 }}>
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'instances' && (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <IconPlaceholder size={48}>🖥️</IconPlaceholder>
            <h2
              style={{
                fontSize: '20px',
                fontWeight: '600',
                color: 'white',
                marginBottom: '8px',
                marginTop: '16px',
              }}
            >
              Instance Management
            </h2>
            <p style={{ color: '#9ca3af' }}>Instance monitoring coming soon</p>
          </div>
        )}
        {activeTab === 'memory' && (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <IconPlaceholder size={48}>💾</IconPlaceholder>
            <h2
              style={{
                fontSize: '20px',
                fontWeight: '600',
                color: 'white',
                marginBottom: '8px',
                marginTop: '16px',
              }}
            >
              Memory Archive
            </h2>
            <p style={{ color: '#9ca3af' }}>Memory management coming soon</p>
          </div>
        )}
        {activeTab === 'settings' && <SettingsView />}
      </div>
    </div>
  )
}

export default DeepTreeEchoHubSimple
