# Third-party notices

The application uses `eecircuit-engine@1.9.0`, pinned in package-lock.json and installed from npm. Source: https://github.com/eelab-dev/EEcircuit-engine. The wrapper is MIT, copyright Danial Chitnis; retain the package license and embedded notices in built assets. Its bundled ngspice 45.2 and third-party model data retain their upstream mixed licenses and notices. No bundled foundry models are used by the app's regulator circuits.

TI's proprietary LM1117 model is downloaded separately by the user for the optional reference comparison. It is excluded from source and deployment. The JSON report records numerical results, source URL, checksum and compatibility transformations; it does not redistribute the manufacturer's model or claim a license to it.
