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
        ├── data-services.md
        ├── delivery-pipeline.md
        ├── deployment-model.md
        └── frontends.md
```

| Page | Subject | Feature Requests |
|---|---|---|
| [Deployment model](08-technical/service-architecture/deployment-model.md) | Terraform, its R2 state, and the Workers, Workers Logs, Cloudflare Access setup, and Content D1 it creates | FR-00000, FR-00001, FR-00003, FR-00004, FR-00005 |
| [Delivery pipeline](08-technical/service-architecture/delivery-pipeline.md) | The workspace, tests, and Wrangler deployment of the Workers, and the game client's tests and APK build | FR-00001, FR-00003, FR-00004, FR-00005 |
| [Access and edge services](08-technical/service-architecture/access-and-edge.md) | The standard response format, the public `gateway` endpoints with the app version check and request log, and Content Studio's Cloudflare Access sign-in, staff users, and API | FR-00001, FR-00003, FR-00004, FR-00005 |
| [Data services](08-technical/service-architecture/data-services.md) | Content D1, its tables and migrations, and the query script | FR-00004 |
| [Frontends](08-technical/service-architecture/frontends.md) | Content Studio's layout and pages, and the Godot game client's loading screen | FR-00003, FR-00004, FR-00005 |
| [Developer onboarding](08-technical/developer-onboarding.md) | The onboarding script and its checks | FR-00000, FR-00001, FR-00002, FR-00003, FR-00004, FR-00005 |

Changes to these pages are recorded in [`CHANGELOG.md`](CHANGELOG.md).
