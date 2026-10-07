# Document structure

```text
doc/
├── README.md
├── source-of-truth.md
├── document-structure.md
├── glossary.md
├── todo.md
├── document-change-management.md
├── howto.md
├── howto-feature-request.md
├── howto-cloudflare-setup.md
├── grill-me.md
├── test-driven-development.md
├── 01-game-design/
│   ├── README.md
│   ├── vision-and-pillars.md
│   ├── core-game-loop.md
│   └── player-experience.md
├── 02-rules/
│   ├── README.md
│   ├── realtime-rules-translations.md
│   └── open-rules-decisions.md
├── 03-gameplay-systems/
│   ├── README.md
│   ├── equipment-and-weapon-configurations.md
│   ├── parties-and-quest-sessions.md
│   └── dungeon-level/
│       ├── README.md
│       ├── character-modes.md
│       ├── enemy-states.md
│       ├── hero-states.md
│       ├── tactical-pause.md
│       ├── threat-sources.md
│       └── traits-and-stage-offers.md
├── 04-content-design/
│   ├── README.md
│   ├── campaign-arc-example-fallen-castle.md
│   ├── dungeon-and-stage-design-rules.md
│   ├── encounter-and-balance-rules.md
│   ├── journey-and-dungeon-arc-configuration-rules.md
│   └── dungeon-level/
│       ├── character-mode-configuration-rules.md
│       └── enemy-state-configuration-rules.md
├── 05-ux/
│   ├── README.md
│   ├── dungeon-gameplay-and-tactical-pause.md
│   ├── hero-creation.md
│   └── trait-selection.md
├── 06-3d-production/
│   ├── README.md
│   ├── 00-project-blocking-risks.md
│   ├── 01-3d-strategy.md
│   ├── 02-go-no-go-plan.md
│   ├── 04-fallback-strategies.md
│   ├── contracts/
│   ├── rig-profiles/
│   ├── body-bases/
│   ├── hands-and-grips/
│   ├── equipment/
│   ├── animation/
│   ├── runtime/
│   ├── validation/
│   └── research-log/
├── 07-data-model/
│   ├── README.md
│   ├── assets/
│   ├── character-model/
│   ├── dungeon-levels/
│   ├── journey/
│   ├── player-state/
│   ├── traits/
│   └── workflow/
├── 08-technical/
│   ├── README.md
│   ├── database-change-management.md
│   ├── runtime-manifest.md
│   ├── runtime-responsibilities.md
│   ├── runtime-state-and-persistence.md
│   ├── service-architecture.md
│   └── service-architecture/
│       ├── deployment-model.md
│       ├── technology.md
│       ├── frontends.md
│       ├── delivery-pipeline.md
│       ├── access-and-edge.md
│       ├── application-services.md
│       ├── game-runtime.md
│       ├── data-services.md
│       ├── operations.md
│       └── game-server-platform.md
├── 09-content-studio/
│   ├── README.md
│   └── dungeon-levels/
│       └── dungeon-editor.md
├── 11-testing/
│   ├── README.md
│   ├── 3d-validation-plan.md
│   ├── tactical-pause-test-plan.md
│   └── trait-system-test-plan.md
├── 12-decisions/
│   ├── README.md
│   ├── decision-log.md
│   └── open-decisions.md
└── 13-references/
    └── README.md
```

The tree contains design specifications, contracts, and indexes. Concrete game content is maintained through Content Studio. Feature Requests and as-built documentation of the implemented game and services are kept under [`delivery/`](../delivery/).
