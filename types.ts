// ─── Core domain types ───────────────────────────────────────────────────────
// All times expressed as minutesFromMidnight (integer). Display strings kept
// alongside as HH:MM for rendering only.

export interface Airport {
  id: string
  name: string
  city: string
  lat: number
  lng: number
  tier: 'mega_hub' | 'regional_hub' | 'spoke'
  capacity_per_hour: number
}

export interface Flight {
  flight_id: string
  tail_id: string
  leg_order: number
  origin: string
  destination: string
  // Raw display strings (HH:MM)
  dep: string
  arr: string
  // Computed minutes-from-midnight (always integer ≥ 0, next-day arr adds 1440)
  depMin: number
  arrMin: number
  block_minutes: number
  pax: number
  turnaround_before_min: number | null
}

export interface Connection {
  connection_id: string
  airport: string
  from_flight: string
  to_flight: string
  passengers: number
  min_connect_minutes: number
}

export interface Crew {
  crew_id: string
  tail_id: string
  base: string
  duty_start: string   // HH:MM display
  dutyStartMin: number // minutes-from-midnight
  max_duty_mins: number
  flight_ids: string[]
}

export interface SpareAircraft {
  tail_id: string
  base: string
  available_from: string   // HH:MM display
  availableFromMin: number // minutes-from-midnight
  seats: number
}

export interface Meta {
  dataset: string
  operating_day: string
  min_turnaround_minutes: number
  seats_per_aircraft: number
  notes: string[]
}

// ─── Normalized dataset (output of buildDataset.ts) ──────────────────────────
export interface NormalizedDataset {
  meta: Meta
  airports: Airport[]
  flights: Flight[]
  connections: Connection[]
  crews: Crew[]
  spare_aircraft: SpareAircraft[]
}

// ─── Closure descriptor ───────────────────────────────────────────────────────
export interface AirportClosure {
  airportCode: string
  startMin: number
  endMin: number
}

// ─── Recovery actions ─────────────────────────────────────────────────────────
export interface SwapSpareAction {
  type: 'SWAP_SPARE'
  spareAircraftId: string
  flightId: string
}

export interface CancelFlightAction {
  type: 'CANCEL_FLIGHT'
  flightId: string
}

export type RecoveryAction = SwapSpareAction | CancelFlightAction

// ─── Per-flight result ────────────────────────────────────────────────────────
export type FlightStatus = 'ON_TIME' | 'DELAYED' | 'CANCELLED' | 'CREW_TIMEOUT'

export type CancelReason =
  | 'MANUAL_CANCEL'
  | 'AIRCRAFT_OUT_OF_POSITION'
  | 'CREW_DUTY_EXCEEDED'

export type DelayCause =
  | 'AIRCRAFT_ROTATION'
  | 'ORIGIN_CLOSURE'
  | 'DEST_CLOSURE'

export interface FlightResult {
  flightId: string
  tailId: string            // may differ from scheduled if SWAP_SPARE applied
  origin: string
  destination: string
  schedDepMin: number
  schedArrMin: number
  actualDepMin: number | null   // null if cancelled
  actualArrMin: number | null   // null if cancelled
  delayMin: number              // 0 if on-time or cancelled
  status: FlightStatus
  cancelReason: CancelReason | null
  delayCauses: DelayCause[]
  causalChain: string[]         // ordered upstream flightIds that caused this delay
}

// ─── Connection result ────────────────────────────────────────────────────────
export interface ConnectionResult {
  connectionId: string
  airport: string
  fromFlightId: string
  toFlightId: string
  passengers: number
  minConnectMin: number
  actualBufferMin: number | null
  broken: boolean
  strandedPax: number
}

// ─── Crew result ──────────────────────────────────────────────────────────────
export interface CrewResult {
  crewId: string
  tailId: string
  dutyStartMin: number
  actualDutyMin: number
  maxDutyMin: number
  violated: boolean
  violationMin: number
}

// ─── Valid recovery suggestions ───────────────────────────────────────────────
export interface ValidRecovery {
  action: RecoveryAction
  description: string
  estimatedStrandedPaxReduction: number
}

// ─── Top-level simulation result ──────────────────────────────────────────────
export interface SimulationResult {
  flightResults: FlightResult[]
  connectionResults: ConnectionResult[]
  crewResults: CrewResult[]
  strandedPassengers: number
  cancelledFlights: number
  delayedFlights: number
  validRecoveries: ValidRecovery[]
}

// ─── Deterministic Recovery Optimizer Types ──────────────────────────────────
export interface SimSummary {
  totalDelayMins: number
  delayedCount: number
  cancelledCount: number
  timeoutsCount: number
  brokenCxCount: number
  strandedPax: number
}

export interface CandidateDeltas {
  strandedSaved: number
  crewTimeoutsPrevented: number
  delayMinutesSaved: number
  delayedFlightsSaved: number
  newlyCancelledFlights: number
}

export interface CandidateRecovery {
  actionId: string
  action: RecoveryAction
  label: string
  headline: string
  score: number
  afterSummary: SimSummary
  deltas: CandidateDeltas
  tradeoffNote: string
}

export interface RecoveryOptimizationResult {
  beforeSummary: SimSummary
  topCandidates: CandidateRecovery[]
  topCausalChains: string[]
}

// ─── AI Dispatcher Types ─────────────────────────────────────────────────────
export interface AiRecommendation {
  rank: number
  actionId: string
  headline: string
  reasoning: string
  tradeoffWarning: string
}

export interface AiDispatchResponse {
  situationSummary: string
  rootCauseChains: string[]
  recommendations: AiRecommendation[]
}

export interface NumericVerificationResult {
  verified: boolean
  matchedCount: number
  totalExtracted: number
  unmatchedNumbers: number[]
}

export interface AiDispatchState {
  loading: boolean
  response: AiDispatchResponse | null
  verification: NumericVerificationResult | null
  error: string | null
  isFallback: boolean
}
