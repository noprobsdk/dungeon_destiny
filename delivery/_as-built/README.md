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
        ├── deployment-model.md
        └── frontends.md
```

| Page | Subject | Feature Requests |
|---|---|---|
| [Deployment model](08-technical/service-architecture/deployment-model.md) | Terraform, its R2 state, the Workers, and the Cloudflare Access setup it creates | FR-00000, FR-00001, FR-00003 |
| [Delivery pipeline](08-technical/service-architecture/delivery-pipeline.md) | The workspace, tests, and Wrangler deployment of the Workers | FR-00001, FR-00003 |
| [Access and edge services](08-technical/service-architecture/access-and-edge.md) | The standard response format, the public endpoints, and the Cloudflare Access sign-in for Content Studio | FR-00001, FR-00003 |
| [Frontends](08-technical/service-architecture/frontends.md) | Content Studio and its pages | FR-00003 |
| [Developer onboarding](08-technical/developer-onboarding.md) | The onboarding script and its checks | FR-00000, FR-00001, FR-00002, FR-00003 |

Changes to these pages are recorded in [`CHANGELOG.md`](CHANGELOG.md).
