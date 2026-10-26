# Shared Interfaces and Contracts

Canonical source: `socratic-monorepo/packages/types/src/index.ts`, re-exported by the package barrel. Do not duplicate these definitions inside apps or services.

## Feature 1 Contracts (Bảng Tương Tác Thông Minh Trên Lớp)

- `SimulationBlueprint`, `SimParamConfig`, `EngineType`, `CurriculumLevel`, and `TemplateId` in `packages/types/src/simulation.ts` describe the interactive STEM simulation payload consumed by teacher-board engines and widgets.
- `SimulationBlueprintSchema` and `SimParamConfigSchema` in `packages/types/src/schemas.ts` validate the runtime payload.
- `UnifiedLassoResponse`, `OCRResult`, `SimulationBlueprintCore`, and `SocraticCue` in `packages/types/src/index.ts` describe the lasso-to-simulation and handwriting recognition response.
- `CanvasStrokePoint`, `CanvasStroke`, and `CanvasState` define the drawing and temporal scene chunking state used by teacher-board.
- `SandboxEvent` defines variable synchronization events over realtime channels.

## Feature 2 Contracts (Gia Sư AI Socratic & Nền Tảng Tự Học Sau Giờ Học)

- `SocraticStepEvaluation`, `StepStatus`, `VerificationSource`, `ErrorCategory`, and `VisualDebuggerConfig` define companion evaluation and visual debugger results (Chemical Balance, Force Polygon, Extrema Tangent, Osmosis Pressure).
- `User`, `ScaffoldingStep`, `SocraticSession`, and `KnowledgeHeatmapNode` define student session, BKT state, and teacher heatmap data.
- `SocraticStepEvaluationSchema` is the runtime validator for evaluation responses.

## Canvas and realtime

- `CanvasStrokePoint`, `CanvasStroke`, and `CanvasState` define the shared drawing state used by teacher-board and the realtime gateway.
- `SandboxEvent` defines variable synchronization events over Socket.IO.
- `StrokePointSchema`, `StrokeSchema`, and `CanvasStateSchema` validate serialized canvas state.

## Pilot data

- `PILOT` and `vn` are exported from `packages/types/src/pilot.ts`; source data is `pilot2026.json`.
- Pilot claims must remain sourced from this package and must not be redefined in presentation or app code.

## Transport owners

- Socket.IO namespace and event wiring: `services/api-gateway/src/sockets/sandboxGateway.ts`.
- HTTP bootstrap and health/proxy routes: `services/api-gateway/src/index.ts`.
- Python AI routes and domain adapters: `services/ai-engine/routers`, `cache`, `llm`, and `symbolic`.

Any contract change must update its source type, runtime schema (when applicable), all consumers, and this document in the same change.
