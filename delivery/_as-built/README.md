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
        └── deployment-model.md
```

| Page | Subject | Feature Requests |
|---|---|---|
| [Deployment model](08-technical/service-architecture/deployment-model.md) | Terraform and its R2 state for the Cloudflare infrastructure | FR-00000 |
| [Developer onboarding](08-technical/developer-onboarding.md) | The onboarding script and its checks | FR-00000 |

Changes to these pages are recorded in [`CHANGELOG.md`](CHANGELOG.md).
