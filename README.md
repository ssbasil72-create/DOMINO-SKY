# Domino Sky – Flight Network Delay Simulator

Vite + React + TypeScript + Tailwind CSS single-day flight operations simulator for the **Domino Sky** Indian domestic network (16 airports, 70 flights, 16 aircraft, 21 passenger connections, 16 crews, 2 spare aircraft).

## Quick Start

```bash
# 1. Install Node.js ≥ 20 from https://nodejs.org, then:
pnpm install

# 2. Build the normalized dataset (required once, or after editing /data/)
pnpm build:data

# 3. Start the dev server
pnpm dev
```

## Project Structure

```
domino-sky/
├── data/
│   └── flight_network.json          # Raw source data (single JSON file)
├── scripts/
│   └── buildDataset.ts              # Parses → src/data/normalizedDataset.json
├── src/
│   ├── data/
│   │   └── normalizedDataset.json   # Generated; imported by Vite as static JSON
│   ├── lib/
│   │   └── simulator.ts             # ★ ALL math lives here (delay chains, crews, pax)
│   ├── types.ts                     # Shared TypeScript interfaces
│   ├── App.tsx                      # UI shell (reads simulator output only)
│   └── main.tsx
├── .agent/rules/
│   └── project-rules.md             # Coding rules for AI agents
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

## Key Rule
> **ALL** delay, chain, crew, and passenger calculations must come strictly from `src/lib/simulator.ts`. Never compute math in UI components.

## Data Counts
| Entity | Count |
|---|---|
| Airports | 16 |
| Flights | 70 |
| Aircraft | 16 (VT-DS01 … VT-DS16) |
| Passenger connections | 21 |
| Crews | 16 |
| Spare aircraft | 2 (VT-DS17 @ BLR, VT-DS18 @ DEL) |
