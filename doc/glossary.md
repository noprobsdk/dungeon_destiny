# Glossary

| Term | Meaning |
|---|---|
| GDD | Authoritative game-design documentation. |
| Content Studio (CS) | Authoring and publication system that executes GDD rules as structured data. |
| Party | A temporary group of players assembled through explicit invitations to attempt exactly one cooperative Quest. |
| Saved Party | A reusable invitation list based on a previous or deliberately saved Party; using it always sends new invitations. |
| Quest | A selectable cooperative online activity attempted by a Party; it is separate from the solo Journey hierarchy. |
| Quest Level (QL) | The Quest's configured challenge and eligibility level; it is separate from Hero Level and Dungeon Level numbering. |
| Quest Session | The authoritative online runtime instance created for one Party's Quest attempt. |
| Journey | The complete long-term sequence of related Dungeon Arcs that forms the Hero's larger adventure. |
| Dungeon Arc | A connected story, location, goal, visual identity, enemy ecosystem, and tactical progression spanning a configured range of Dungeon Levels. |
| Dungeon Level (DL) | One finite, sequential dungeon configured in Content Studio. |
| Stage | An ordered encounter or progression section inside a Dungeon Level. |
| Hero Level (HL) | Permanent character level based on Hero XP. |
| Account Layer | The player's account-level layer above individual Heroes; it owns ordinary Equipment. |
| Account Inventory | Account Layer storage of Equipment instances; a Hero's Equipment Configuration references instances from it instead of owning copies, and each instance occupies at most one Equipment Slot of one Hero. |
| Item Level | An Equipment item's fixed level; its statistics do not scale to the Hero using it, and Rarity expresses quality within an Item Level. |
| Account-bound | Default binding of ordinary Equipment to the Account Layer; it does not imply player-to-player trading. |
| Hero-bound | Exception binding of Equipment to one Hero, reserved for special Journey or story requirements. |
| Transfer and Unequip | Explicit operation that moves an Equipment instance assigned to one Hero to another; the authoritative service atomically removes the previous assignment before making the new one. |
| Tactical Pause (TP) | Player-triggered temporary time-stop used for tactical actions and assessment. |
| Trait | Temporary run-only modifier selected after eligible Stages. |
| Active Trait Pool | Runtime collection of eligible Trait tiers during the current attempt. |
| Body Archetype | Broad anatomical and movement family, such as humanoid or quadruped; it is not a race, gender, class, or individual model. |
| Body Base | Visible skinned character mesh compatible with a Rig Profile. |
| Rig Profile | Versioned rig compatibility contract: hierarchy, bone names, rest pose, axes, and sockets. |
| Animation Set | Compatible actions for a Rig Profile and combat style. |
| Grip Profile | Approved hand pose and weapon relationship for a weapon family. |
| Runtime Character | App-ready deployment artifact assembled from approved source components. |
