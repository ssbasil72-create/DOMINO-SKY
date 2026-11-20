import React, { useState, useMemo, useEffect } from 'react'
import rawDataset from './data/normalizedDataset.json'
import type {
  NormalizedDataset,
  AirportClosure,
  RecoveryAction,
  AiDispatchState,
} from './types'
import { runSimulation } from './lib/simulator'
import { evaluateRecoveryCandidates } from './lib/rankRecoveries'
import { getAiDispatcherAnalysis } from './lib/aiDispatcher'
import { ControlBar } from './components/ControlBar'
import { KpiStrip } from './components/KpiStrip'
import { NetworkMap } from './components/NetworkMap'
import { CascadeTable } from './components/CascadeTable'
import { CausalDrawer } from './components/CausalDrawer'
import { AiDispatcherPanel } from './components/AiDispatcherPanel'

const dataset = rawDataset as unknown as NormalizedDataset

export function App() {
  // Disruption state
  const [closure, setClosure] = useState<AirportClosure>({
    airportCode: '',
    startMin: 0,
    endMin: 0,
  })

  // Recovery states
  const [activeRecovery, setActiveRecovery] = useState<RecoveryAction | null>(null)
  const [previewRecovery, setPreviewRecovery] = useState<RecoveryAction | null>(null)

  // Drawer / Side Panel states
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null)
  const [isAiPanelOpen, setIsAiPanelOpen] = useState<boolean>(false)

  // AI Dispatcher analysis state
  const [aiState, setAiState] = useState<AiDispatchState>({
    loading: false,
    response: null,
    verification: null,
    error: null,
    isFallback: false,
  })

  // Deterministic candidate evaluation
  const optimizationResult = useMemo(() => {
    return evaluateRecoveryCandidates(dataset, closure)
  }, [closure])

  // Reset AI state when closure changes
  useEffect(() => {
    setAiState({
      loading: false,
      response: null,
      verification: null,
      error: null,
      isFallback: false,
    })
    setPreviewRecovery(null)
  }, [closure.airportCode, closure.startMin, closure.endMin])

  // Handler to trigger AI Dispatcher analysis
  const handleRunAiAnalysis = async () => {
    setAiState(prev => ({ ...prev, loading: true, error: null }))
    try {
      const res = await getAiDispatcherAnalysis(optimizationResult, closure)
      setAiState({
        loading: false,
        response: res.response,
        verification: res.verification,
        error: null,
        isFallback: res.isFallback,
      })
    } catch (err: any) {
      setAiState(prev => ({
        ...prev,
        loading: false,
        error: err?.message || 'Failed to generate dispatch analysis',
      }))
    }
  }

  // Baseline simulation (closure only, no recovery)
  const beforeResult = useMemo(() => {
    return runSimulation(dataset, closure)
  }, [closure])

  // Effective recovery currently being visualized (preview overrides active)
  const effectiveRecovery = previewRecovery ?? activeRecovery

  // Comparison simulation with recovery
  const afterResult = useMemo(() => {
    if (!effectiveRecovery) return null
    try {
      return runSimulation(dataset, closure, effectiveRecovery)
    } catch (err) {
      console.warn('Recovery action failed:', err)
      return null
    }
  }, [closure, effectiveRecovery])

  // Result shown in interactive map and table
  const currentResult = afterResult ?? beforeResult

  // Reset to clear skies
  const handleResetAll = () => {
    setClosure({ airportCode: '', startMin: 0, endMin: 0 })
    setActiveRecovery(null)
    setPreviewRecovery(null)
    setSelectedFlightId(null)
    setAiState({
      loading: false,
      response: null,
      verification: null,
      error: null,
      isFallback: false,
    })
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* 1. Disruption & Recovery Control Bar (Top) */}
      <ControlBar
        airports={dataset.airports}
        closure={closure}
        onClosureChange={newClosure => {
          setClosure(newClosure)
          if (newClosure.startMin >= newClosure.endMin || !newClosure.airportCode) {
            setActiveRecovery(null)
            setPreviewRecovery(null)
          }
        }}
        activeRecovery={activeRecovery}
        validRecoveries={beforeResult.validRecoveries}
        onSelectRecovery={rec => {
          setActiveRecovery(rec)
          setPreviewRecovery(null)
        }}
        onResetAll={handleResetAll}
        onOpenAiPanel={() => setIsAiPanelOpen(true)}
        topCandidatesCount={optimizationResult.topCandidates.length}
      />

      {/* Main Control Center Grid */}
      <main className="flex-1 p-4 md:p-6 space-y-5 max-w-[1720px] w-full mx-auto flex flex-col">
        {/* Preview Mode Alert Banner if user is previewing a card from AI Panel */}
        {previewRecovery && (
          <div className="bg-sky-950/80 border border-sky-500/80 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs font-mono text-sky-200 shadow-lg animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse"></span>
              <span>
                PREVIEW MODE ACTIVE: Visualizing <strong>{previewRecovery.type === 'SWAP_SPARE' ? `Swap Spare ${previewRecovery.spareAircraftId}` : `Cancel ${previewRecovery.flightId}`}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setActiveRecovery(previewRecovery)
                  setPreviewRecovery(null)
                }}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[11px] transition-colors"
              >
                Apply This Recovery
              </button>
              <button
                onClick={() => setPreviewRecovery(null)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] transition-colors"
              >
                Exit Preview
              </button>
            </div>
          </div>
        )}

        {/* 2. KPI & Before-vs-After Impact Strip */}
        <KpiStrip
          beforeResult={beforeResult}
          afterResult={afterResult}
          isRecoveryActive={effectiveRecovery !== null}
        />

        {/* 3 & 4. Split Layout: Interactive Network Map (Left) + Domino Cascade Table (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 items-stretch min-h-[640px]">
          {/* Left Panel: Network Route Map (5 cols) */}
          <div className="lg:col-span-5 h-[680px]">
            <NetworkMap
              airports={dataset.airports}
              flights={dataset.flights}
              flightResults={currentResult.flightResults}
              spareAircraft={dataset.spare_aircraft}
              closedAirportCode={closure.startMin < closure.endMin ? closure.airportCode : ''}
              onSelectAirport={code => {
                if (!code) {
                  setClosure({ airportCode: '', startMin: 0, endMin: 0 })
                  setActiveRecovery(null)
                  setPreviewRecovery(null)
                } else {
                  setClosure({
                    airportCode: code,
                    startMin: closure.startMin > 0 ? closure.startMin : 420, // 07:00
                    endMin: closure.endMin > 0 ? closure.endMin : 510,     // 08:30 (90m)
                  })
                }
              }}
            />
          </div>

          {/* Right Panel: Domino Cascade Table (7 cols) */}
          <div className="lg:col-span-7 h-[680px]">
            <CascadeTable
              flights={dataset.flights}
              flightResults={currentResult.flightResults}
              beforeFlightResults={effectiveRecovery ? beforeResult.flightResults : undefined}
              crews={dataset.crews}
              onSelectFlight={setSelectedFlightId}
            />
          </div>
        </div>
      </main>

      {/* Causal Domino Drawer / Modal */}
      <CausalDrawer
        flightId={selectedFlightId}
        flightResults={currentResult.flightResults}
        flights={dataset.flights}
        connections={currentResult.connectionResults}
        crews={dataset.crews}
        onClose={() => setSelectedFlightId(null)}
      />

      {/* AI Operations Co-Pilot Drawer / Panel */}
      <AiDispatcherPanel
        isOpen={isAiPanelOpen}
        onClose={() => setIsAiPanelOpen(false)}
        optimization={optimizationResult}
        aiState={aiState}
        onRunAnalysis={handleRunAiAnalysis}
        activeRecovery={activeRecovery}
        previewRecovery={previewRecovery}
        onPreviewRecovery={setPreviewRecovery}
        onApplyRecovery={rec => {
          setActiveRecovery(rec)
          setPreviewRecovery(null)
        }}
      />
    </div>
  )
}

export default App
