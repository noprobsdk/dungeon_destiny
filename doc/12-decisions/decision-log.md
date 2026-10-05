# Decision log

| ID | Decision | Status |
|---|---|---|
| DD-001 | GDD defines design; Content Studio executes it as structured content. | Approved |
| DD-002 | Concrete Dungeon Levels and Stages exist in Content Studio, not Markdown. | Approved |
| DD-003 | The published release manifest is the immutable runtime content snapshot. | Approved |
| DD-004 | Compatible humanoids share a Rig Profile contract, not necessarily one body mesh. | Approved |
| DD-005 | Tactical Pause unlocks when DL 2 becomes active. | Approved design rule; release action set pending |
| DD-006 | Persistent database schema changes use forward-only numbered migrations. Runtime startup must not drop or recreate permanent tables. | Approved |
| DD-007 | Ordinary Equipment is Account-bound and held in the Account Layer's Account Inventory. One Equipment instance can never be used twice: it is either unassigned or occupies exactly one Equipment Slot in one Hero's Equipment Configuration, and cannot appear in both the Primary and Secondary Weapon Configuration. Each Equipment item contains its own usage rules, such as required Hero Level, rather than deriving them from Item Level. A Hero may equip an item only when it meets all of the item's usage rules, so a Hero below an item's required Hero Level cannot equip it. Moving an assigned item to another eligible Hero requires Transfer and Unequip. Usage rules are checked when an item is assigned; if a content release later changes them, an existing assignment stays on its Hero. Hero-bound Equipment is an explicit exception. | Approved |
| DD-008 | Content Studio includes a customer-service page that can look up any content and player data, and apply approved corrections to player data. It requires a separate support role, distinct from content authoring. Lookups and corrections go through the owning services' protected APIs, never directly to a database, and every lookup and correction is audited. | Approved |
