# Nebius / NVIDIA feedback worksheet

Status: live provider access was unavailable during the initial build because no Nebius key was configured. The items below are prompts for recording real observations, not claimed experience.

After connecting Token Factory, record:

- Actual model ID and endpoint used.
- Time to first complete proposal and total investigation latency over several runs.
- Input/output token usage from exported evidence.
- Frequency of valid proposal JSON, repeated proposals, permission violations and appropriate stopping.
- How well failure feedback changed the next selected experiment.
- Any account/model availability errors, with secrets removed.
- A concrete documentation gap or helpful feature, supported by what actually happened.

NVIDIA Nemotron evaluation questions:

- Does it distinguish current-limit or thermal failures from capacitor-repairable transient failures?
- Does it respect a locked capacitor or package adaptation permission?
- Does it stop honestly when the bounded catalog cannot meet the constraints?

Do not submit invented API performance numbers or claim Nebius AI Cloud / Serverless Jobs usage: the initial deployment uses Token Factory inference integration and browser-side SPICE, not those optional services.
