# Feature Request recap template

Use this format for a paste-ready recap after a Feature Request has been
implemented and tested.

The recap summarizes the result. It does not replace the Feature Request or
the as-built documentation. GitHub Issues are for traceability and are not
documentation sources.

## Template

Feature Request `<number>` has been implemented and tested
`<together with Feature Request XXXX, when applicable>`.

`<Brief description of what was created or changed.>`

`<List the principal features, content, data structures, services, or
configurations:>`

- `<feature or result>`;
- `<feature or result>`; and
- `<feature or result>`.

`<Describe relevant relationships, rules, ownership, or scope boundaries.>`

`<Describe what the implementation creates, changes, or supplies in the
Content Studio, database, or Godot client, including what dependent work
consumes.>`

`<Describe significant implementation details such as file naming, placement,
dependencies, or migrations. Omit this paragraph when it is not relevant.>`

`<State where sensitive or non-Git artifacts were stored, when applicable.
Never include secrets, private keys, signing keys, tokens, or credentials in
the recap.>`

Documentation: [Feature Request `<number>`](`<GitHub URL to the Feature Request README>`)

Implementation: [`<implementation file or directory>`](`<GitHub implementation URL>`)

## Writing rules

- Use past tense and state only verified results.
- Use the exact Feature Request number and the exact names of implemented
  features, content, and data structures.
- State which environment and stage apply when relevant.
- Describe outputs, such as exported content, schemas, or builds, when
  dependent work consumes them.
- Mention related Feature Requests only when they were implemented or tested
  together.
- Link to GitHub documentation and implementation.
- Omit optional paragraphs and links that do not apply.
- Do not state that work is ready for approval after it has already been
  approved.
- Do not expose credentials or link to credential files.
