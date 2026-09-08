# Selected gstack methods

These six references synthesize methods from [garrytan/gstack v1.81.0.0](https://github.com/garrytan/gstack/tree/0530392821c277b95e5cd65aa9d9fda4248718b2), revision `0530392821c277b95e5cd65aa9d9fda4248718b2`. They retain existing local skill owners and permission boundaries; they do not install or reproduce gstack's runtime, generated preambles, telemetry, scoring, or automatic publication workflows.

| Local reference | Upstream workflow | Retained method |
| --- | --- | --- |
| [Exploratory web QA](software-craft/references/verify-change/references/exploratory-web-qa.md) | [qa-only](https://github.com/garrytan/gstack/blob/0530392821c277b95e5cd65aa9d9fda4248718b2/qa-only/SKILL.md.tmpl), [shared QA methodology](https://github.com/garrytan/gstack/blob/0530392821c277b95e5cd65aa9d9fda4248718b2/qa/sections/qa-patterns.md) | Journey/state exploration, reproduction evidence, and unobserved coverage |
| [Developer onboarding](software-craft/references/verify-change/references/developer-onboarding.md) | [devex-review](https://github.com/garrytan/gstack/blob/0530392821c277b95e5cd65aa9d9fda4248718b2/devex-review/SKILL.md.tmpl) | Executed first-success and error-recovery walkthroughs |
| [Release coverage](technical-documentation/references/release-coverage.md) | [document-release](https://github.com/garrytan/gstack/blob/0530392821c277b95e5cd65aa9d9fda4248718b2/document-release/SKILL.md.tmpl), [release procedure](https://github.com/garrytan/gstack/blob/0530392821c277b95e5cd65aa9d9fda4248718b2/document-release/sections/release-body.md.tmpl) | Changed public surface by reader need, diagram drift, and actionable release notes |
| [Infrastructure and supply-chain audit](software-craft/references/secure-system/references/infrastructure-supply-chain-audit.md) | [cso](https://github.com/garrytan/gstack/blob/0530392821c277b95e5cd65aa9d9fda4248718b2/cso/SKILL.md.tmpl), [audit phases](https://github.com/garrytan/gstack/blob/0530392821c277b95e5cd65aa9d9fda4248718b2/cso/sections/audit-phases.md.tmpl) | CI privilege paths, secrets, dependency and executable-skill provenance |
| [Demand discovery](product-management/references/demand-discovery.md) | [office-hours diagnostic](https://github.com/garrytan/gstack/blob/0530392821c277b95e5cd65aa9d9fda4248718b2/office-hours/sections/phase-2a-startup-diagnostic.md.tmpl) | Stage-aware demand, workaround, and unassisted-use questions |
| [Branch-aware handoffs](software-craft/references/transfer-knowledge/references/branch-aware-handoffs.md) | [context-save](https://github.com/garrytan/gstack/blob/0530392821c277b95e5cd65aa9d9fda4248718b2/context-save/SKILL.md.tmpl), [context-restore](https://github.com/garrytan/gstack/blob/0530392821c277b95e5cd65aa9d9fda4248718b2/context-restore/SKILL.md.tmpl) | Branch/revision identity, immutable snapshots, and current-state reconciliation |

Each reference links its pinned upstream source. Existing independently sourced material retains its own notices; this notice does not relicense the surrounding collection.

## Upstream license

The [upstream MIT notice](https://github.com/garrytan/gstack/blob/0530392821c277b95e5cd65aa9d9fda4248718b2/LICENSE) is retained below.

MIT License

Copyright (c) 2026 Garry Tan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
