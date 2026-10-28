# Model comparison and uncertainty

The app uses real ngspice with lab-authored behavioral regulator models. This file distinguishes numerical execution, reference comparisons and unvalidated device behavior.

## TI LM1117 reference comparison

`reference-comparison.json` records six operating conditions compared against Texas Instruments' LM1117 3.3 V PSpice model, Final 1.1 (17 March 2015), obtained from `https://www.ti.com/lit/zip/snom488`.

The original file's SHA-256 and the exact compatibility transformations are recorded in the report. The copyrighted manufacturer model is not redistributed in this repository. The adapter translates its table, IF and switch syntax for this ngspice WASM build; this is an adapted simulation reference, not a hardware measurement.

The initial comparison exposed two shortcomings in the app's LM1117 approximation: linear scaling understated dropout, and rated current had been used as the current-limit clamp. The approximation now uses the reference's nominal dropout curve and 1.2 A model current limit; the independent rated-current check remains 800 mA.

The report compares the 2–2.8 ms load plateau at inputs of 3.8 and 5 V, loads of 100, 400 and 800 mA, with a 100 µF output capacitor. Maximum observed plateau error is approximately **40.3 mV**, below the declared 100 mV comparison threshold. This is a limited regression check after correcting the approximation, not independent proof of device accuracy.

Transient minima/maxima are also included and **are not claimed to match**. The check establishes neither hardware qualification nor validation of MCP1700/AP2112 models. Those remain datasheet-constrained approximations.

To reproduce, download and extract TI's model locally, then run:

```bash
npm ci --ignore-scripts --no-audit --no-fund
node scripts/reference-check.mjs /path/to/LM1117_N_3P3_TRANS.LIB
```

The script writes `docs/reference-comparison.json` and fails its declared acceptance criterion if the plateau error exceeds 100 mV. Run it separately from other simulator processes; the comparison deliberately completes app-model runs before creating reference instances.

## Default assumption sweep

The checkbox **Sweep assumed control dynamics** is enabled by default. Each proposal runs at minimum, midpoint and maximum input under three assumed control profiles:

| Profile | Loop time constant | Effective output resistance |
| --- | ---: | ---: |
| Fast | 20 µs | 0.04 Ω |
| Nominal | 40 µs | 0.08 Ω |
| Slow | 80 µs | 0.12 Ω |

All selected tests must pass. These profiles are engineering assumption stress tests, **not** manufacturer process/temperature distributions or device-specific fitted dynamics. Repeated input endpoints are deduplicated.

For the default 400 mA scenario, AP2112 with 100 µF passes the nominal model but fails the slow-profile envelope. The 220 µF candidate passes this tested assumption matrix. This does not establish that changing a real AP2112 board to 220 µF guarantees the same behavior.

The agent cannot disable the sweep or change any frozen requirement. Turning the checkbox off creates a new user input snapshot and clearly narrows the test matrix.

## Remaining physical-validation limits

No device-specific transient fit for replacement parts, no production-tolerance sweep, no ESR-stability analysis, no startup certification, no PCB/enable/pinout validation, and no physical hardware tests. Temperature is an estimated steady-state result from user-selected board θJA, not electrothermal simulation. These limits are displayed in the app and exported with the run.
