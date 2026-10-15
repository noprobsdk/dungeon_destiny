# As-built documentation

This directory documents what has been implemented and verified for Dungeon
Destiny. Each page is sourced from completed Feature Requests and names them.
The folder structure and page names mirror [`doc/`](../../doc/), as described
in [`delivery/README.md`](../README.md).

```text
_as-built/
├── README.md
├── CHANGELOG.md
└── 08-technical/
    ├── developer-onboarding.md
    └── service-architecture/
        ├── access-and-edge.md
        ├── delivery-pipeline.md
        └── deployment-model.md
```

| Page | Subject | Feature Requests |
|---|---|---|
| [Deployment model](08-technical/service-architecture/deployment-model.md) | Terraform, its R2 state, and the Workers it creates | FR-00000, FR-00001 |
| [Delivery pipeline](08-technical/service-architecture/delivery-pipeline.md) | The workspace, tests, and Wrangler deployment of the Workers | FR-00001 |
| [Access and edge services](08-technical/service-architecture/access-and-edge.md) | The standard response format and the public endpoints | FR-00001 |
| [Developer onboarding](08-technical/developer-onboarding.md) | The onboarding script and its checks | FR-00000, FR-00001 |

Changes to these pages are recorded in [`CHANGELOG.md`](CHANGELOG.md).
