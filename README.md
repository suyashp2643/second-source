# Second Source

**A replacement is a hypothesis. Test it.**

An interactive 3.3 V regulator replacement workbench for the Nebius × NVIDIA Global AI Hackathon, Best Apps and Agents track. NVIDIA Nemotron proposes experiments using the Nebius Token Factory inference API. Genuine ngspice runs in a browser Web Worker; fixed evaluator code determines pass/fail from measured traces and catalog limits.

## Current status

- Working offline baseline: fully runnable, explicitly labeled deterministic, with no language model calls.
- Live Nemotron integration: implemented with proposal validation, iterative feedback and explicit API errors. Requires a valid Nebius API key. **A live provider call has not yet been verified in this workspace because no key was available.**
- Three curated 3.3 V candidates, up to nine SPICE tests per experiment with the default control-assumption sweep, load-step transient simulation, thermal estimate, source-linked catalog cards, exportable evidence.
- Public source: https://github.com/suyashp2643/second-source. Cloudflare Pages + Functions packaging is ready; account deployment still needs authenticated access. A YouTube demo has not been recorded. See `docs/CLOUDFLARE.md`.

## Run locally

Requires Node.js 24 or newer. The simulator dependency is pinned with an integrity-checked npm lockfile.

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run build
npm run dev
```

Open http://localhost:3000. The default offline baseline needs no key. The simulator is downloaded from the same server, with no simulator CDN dependency. The Pages build serves the simulator JavaScript and WebAssembly as separate same-origin assets so its content policy can stay restricted.

For local live inference, click **Connect Nemotron**, select live mode and enter a session-only key. Shared server-key mode requires an access code and a D1 quota binding; see `docs/CLOUDFLARE.md`. The key is kept in page memory and sent over the same-origin proxy; it is excluded from exported evidence and browser storage. Use HTTPS when serving beyond localhost.

Default model: `nvidia/nemotron-3-super-120b-a12b`, matching Nebius's documented example. Availability is account-dependent; an NVIDIA Nemotron model ID can be selected in the connection dialog or `NEBIUS_MODEL`. The endpoint is fixed to `https://api.tokenfactory.us-central1.nebius.com/v1/chat/completions`, preventing credentials from being redirected to arbitrary providers.

Docker alternative:

```bash
docker build -t second-source .
docker run --rm -p 3000:3000 --env-file .env second-source
```

## Try it

1. Run the default 3.8–5 V input, 400 mA peak, 35 °C ambient scenario.
2. Inspect the failing original LM1117-3.3 baseline.
3. The offline baseline tries eligible candidates and capacitor sizes. AP2112K-3.3 with 220 µF passes the default assumption sweep. A 100 µF proposal passes nominal dynamics but fails the slow-profile envelope.
4. Change the peak load to 800 mA, or set ambient to 85 °C. The same replacement fails current or thermal checks.
5. Try an arbitrary value such as 330 mA and 3.95 V minimum input. Requirements feed directly into netlist generation; results are not selected from stored scenarios.
6. Open **Run evidence** and download the JSON. It contains exact requirements, proposals recorded before testing, per-corner netlists and hashes, ngspice logs, measured traces, and each evaluator check.

No outcome or waveform is prerecorded. Presets change only form values. Offline ranking is deterministic and disclosed; live mode never silently falls back to it.

## Architecture

```text
Requirement snapshot → Nemotron proposal → schema/permission validation
→ generated behavioral netlist → ngspice Web Worker
→ fixed evaluator → measured failure feedback → next proposal
```

`src/core.mjs`: curated catalog, input/proposal validation, netlists, measurements, six-check evaluator, offline baseline.

`src/spice-runner.mjs`: executes low/mid/high input corners using EEcircuit's ngspice WebAssembly build.

`src/spice-worker.mjs`: browser background worker to keep the UI responsive.

`src/server.mjs`: same-origin Nebius inference proxy and asset serving. `src/access.mjs` enforces shared-key access and atomic durable quotas. Receives only bounded structured experiment history; model output cannot define pass/fail criteria.

`src/app.mjs`: live UI, immutable run input snapshots, bounded search, cancellation, result inspection and JSON export.

`scripts/build.mjs`: produces a self-contained Cloudflare Worker with compressed assets. `dist/server/index.js` is the deployment artifact, not the authoring source.

Live search is bounded to six replacement proposals after the original baseline. A failure means no passing design was found **in the tested search**, not that all possible designs are infeasible. The first passing replacement ends the search. The optimization setting ranks only passing experiments actually tested.

## What is independent

Nemotron may choose only a catalog component, capacitance and rationale. It cannot change the frozen requested load, voltage envelope, thermal limits, package permissions or evaluator. The evaluator calculates six checks: simulated voltage envelope, rated current, input range, estimated junction temperature, minimum capacitance and DC accuracy budget. Model-provided pass flags are ignored. This is software separation, not cryptographic attestation: the browser and exported JSON can be modified by their owner.

## Model fidelity and limitations

**These are lab-authored behavioral approximations, not validated manufacturer transistor-level models. Passing is not a hardware design approval.**

- 3.3 V fixed output only; original LM1117-3.3, MCP1700-3302 and AP2112K-3.3.
- LM1117 uses the nominal dropout curve from the TI reference model. Other datasheet dropout endpoints are linearly interpolated with peak current. Actual dropout is nonlinear and depends on temperature and operating conditions.
- The default sensitivity sweep uses 20/40/80 µs loop time constants and 0.04/0.08/0.12 Ω output resistance. These are shared lab assumptions, not extracted device-specific dynamics. A capacitor repair demonstrates the modeled mechanism, not a validated cure for real silicon.
- Current is clamped at the rated output for MCP1700/AP2112 as a conservative approximation; LM1117 uses the TI reference model's 1.2 A clamp. This is not a general silicon protection model.
- SPICE tests a 5 ms pulse profile (idle → peak at 1 ms → idle at 3 ms) at minimum, midpoint and maximum input. Voltage checks cover 0.8–4.9 ms, excluding startup.
- Thermal result is ambient + estimated dissipation × a user-selected board θJA. No electrothermal feedback or thermal shutdown is simulated. Changing board θJA is a changed user assumption, never an agent repair.
- The accuracy check compares the requested tolerance to the catalog DC accuracy figure. Full production, temperature and combined accuracy/transient corners are not simulated.
- Input decoupling, noise, PSRR, ESR stability regions, layout, pin compatibility, enable routing and real component tolerances are not validated.
- Package adaptation must be enabled to test non-SOT-223 candidates. The app does not design an adapter PCB.
- Datasheets are manually curated with source links. No live availability, vendor price, document upload or automated datasheet extraction is claimed.
- Browser reload clears the session; download evidence to retain a run.

## Verification

```bash
npm test
npm run build
npm run validate
```

Tests execute real ngspice, including original failure, capacitor repair, changed-load failure, changed-temperature failure, low-headroom failure and an unpreset constraint combination. Additional tests exercise locked changes, invalid proposals, malformed traces and provider contract handling. Provider mocks verify integration behavior; they do not demonstrate a live Nebius call.

To reproduce an exported netlist using native ngspice, save a corner's `netlist` as `circuit.cir`, then run:

```bash
ngspice -b -r result.raw circuit.cir
```

## Cloudflare deployment and model comparison

Run `npm run build:pages` to create the Pages deployment bundle. Static assets are separate from the small API Function. See `docs/CLOUDFLARE.md` for deployment and secret handling, and `docs/MODEL_VALIDATION.md` for the limited TI reference comparison and default assumption sweep. The report does not establish hardware reliability.

## Hackathon integration

- **NVIDIA:** live agent uses an NVIDIA Nemotron model, selected from the user's Nebius account.
- **Nebius:** runtime inference calls to Token Factory, with measured simulator outcomes fed into subsequent model calls.
- **Deployment:** hosted worker serves UI/inference proxy; SPICE executes in the visitor's browser.
- **Token Factory development acceleration:** not yet measured; do not claim development use without real usage records.
- **Project origin:** created during this build session, October 28, 2026. It does not reuse the separate GitLab Release Recovery Rehearsal project.

See `docs/DEMO.md` for the recording outline and `docs/FEEDBACK.md` for honest feedback collection.

## License and attribution

Application code: MIT, see `LICENSE`.

Pinned npm dependency EEcircuit-engine 1.9.0: https://github.com/eelab-dev/EEcircuit-engine, MIT wrapper license in the installed package. It includes ngspice 45.2 WebAssembly and bundled third-party model data; retain embedded notices. See `THIRD_PARTY_NOTICES.md`. Manufacturer datasheets are linked, not redistributed.
