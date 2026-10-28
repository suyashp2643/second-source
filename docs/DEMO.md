# Three-minute demonstration outline

Record only actual app execution. Connect a valid Nebius Token Factory API key first and make sure the LIVE NEMOTRON AGENT badge is visible. Do not present offline deterministic selection as AI. Capture a successful provider call and its model/usage metadata in evidence before recording.

0:00–0:20 — Problem: a sensor-board regulator needs replacing, but headline voltage/current ratings do not establish suitability.

0:20–0:45 — Show user-editable input voltage, load and thermal assumptions. Explain the three supported candidates and simplified behavioral model. Start the investigation.

0:45–1:25 — Show the original baseline and Nemotron's actual next proposal. Open a failed experiment and its measured checks. Let the model revise its candidate/capacitance using simulator feedback. Do not edit out an error in a way that misrepresents behavior.

1:25–2:00 — Show a passing modeled candidate and waveform. Change a freely chosen load or minimum voltage, rather than clicking only a preset. Re-run and show the new verdict. If no candidate passes, explain the exhausted search honestly.

2:00–2:30 — Open run evidence: exact inputs, proposal timestamp, genuine ngspice log/header, netlist hash, evaluator checks and Nebius request metadata. Download JSON.

2:30–2:50 — Explain architecture: Nemotron on Nebius proposes; ngspice measures; fixed code evaluates. A model cannot lower the load or label its own answer as passed.

2:50–3:00 — State scope: browser simulation of simplified LDO models, not hardware qualification. Show public repository and public demo URLs once configured.

If inference is slow, label elapsed time and any time compression explicitly. Keep the public video at or below 3 minutes. Never expose the API key or private deployment credentials in the recording.
