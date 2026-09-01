# Delivery documentation

`delivery/` describes only functionality that has been deployed and verified.

It answers:

> What demonstrably exists in a released Dungeon Destiny build?

It does not contain brainstorming, planned design, active development, or functionality that exists only in a pull request.

## Entry conditions

Functionality may be added here only when:

1. its GitHub Feature has approved acceptance criteria;
2. implementation and required tests are complete;
3. the result has been deployed;
4. the deployed result has been verified;
5. the released build and evidence can be identified.

## Structure

The numbered system folders will mirror the relevant parts of `doc/`, but only where released behaviour exists. Released Feature records live under [`00-features/`](00-features/).

Each delivery system file must state:

- delivery status;
- last verified release;
- implementing Feature IDs;
- verification evidence;
- applicable limitations.
