import { useQuery } from '@tanstack/react-query'

// API base URL — .env file se aata hai (VITE_API_URL)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function App() {
  // useQuery — backend ke /api/health ko call karta hai
  // Automatic retry, caching, loading/error states sab built-in hai
  const { data, isLoading, isError } = useQuery({
    queryKey: ['health'],    // Cache key — same key = same cached data
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/health`)
      if (!res.ok) throw new Error('Backend not reachable')
      return res.json()
    },
    retry: 2,                // 2 baar retry karega fail hone pe
    refetchInterval: 30000,  // Har 30 sec mein auto-check
  })

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center space-y-6">
        {/* Title */}
        <h1 className="text-5xl font-bold text-white tracking-tight">
          🔬 ReproForge
        </h1>
        <p className="text-gray-400 text-lg">
          AI-Powered Bug Reproduction Tool
        </p>

        {/* Health Status Card */}
        <div className="mt-8 p-6 rounded-2xl border border-gray-800 bg-gray-900 shadow-lg max-w-md mx-auto">
          {isLoading && (
            <div className="flex items-center gap-3 text-yellow-400">
              <span className="animate-pulse text-2xl">⏳</span>
              <span>Checking backend connection...</span>
            </div>
          )}

          {isError && (
            <div className="flex items-center gap-3 text-red-400">
              <span className="text-2xl">❌</span>
              <span className="font-semibold">Backend not reachable</span>
            </div>
          )}

          {data && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-emerald-400">
                <span className="text-2xl">✅</span>
                <span className="font-semibold text-lg">Backend connected</span>
              </div>
              <div className="text-sm text-gray-500 space-y-1">
                <p>Status: <span className="text-gray-300">{data.status}</span></p>
                <p>Environment: <span className="text-gray-300">{data.environment}</span></p>
                <p>Timestamp: <span className="text-gray-300">{data.timestamp}</span></p>
              </div>
            </div>
          )}
        </div>

        <p className="text-gray-600 text-sm">
          Phase 0 — Environment Setup Complete
        </p>
      </div>
    </div>
  )
}

export default App
