# AiRA harness

This starter contains selected code adapted from AiRA API and AiRA client, with a local browser renderer and HTTP transport.

The client-derived code supplies the named OpenUI parser, component signatures, screen document, navigation, timer ledger and event phrases. The API-derived code supplies skill frontmatter loading and statement serialization. `src/server/prompt.ts` loads the protocol, generated component catalog and `skills/workout.md` for each request.

OpenUI is declarative data. Named statements persist across turns; repeating a statement replaces its value. `root` identifies the screens and optional cursor. The parser resolves references, validation checks allowed components and props, and trusted browser renderers create DOM elements. Component definitions live in `src/shared/openui/openui-library.ts`, validators in `validate.ts`, and renderers in `src/web/components.ts`.

Requests include messages, the current `ui_state` program and queued `client_events`. Responses contain a `reply` string with conversation text and complete OpenUI fences. Builder tools expose this state and allow local patches and run exports.

This slice omits production accounts, databases, memory, native mobile UI, audio, media workers and production tools. Cue is displayed as text. Completed responses are applied atomically rather than streamed. Browser behavior and available components differ from the production client. The generic fixture demonstrates the local protocol; no authored workout flow is included.
