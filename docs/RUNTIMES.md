# Runtime setup

Every browser session starts in Mock. Selecting a provider alone does not invoke it. A live request needs local enablement, provider selection, usage consent and Send or Retry. There is no automatic provider fallback.

## OpenAIAPI

Copy `.env.example` to `.env`. Set `ALLOW_LIVE_API=true`, add a permitted `OPENAI_API_KEY`, and set `OPENAI_MODEL` to a model available to your account. Restart the app, select OpenAIAPI and consent to usage before sending. Keys stay on the server. This adapter uses the Responses endpoint with a structured reply envelope.

## ClaudeCLI

This adapter requires an installed official `claude` executable and an existing Claude-plan login. The implementation requires Claude Code 2.1.211 or later within major version 2, and checks its required flags and login before each request. Unsupported installations are rejected.

In `.env`, set `ALLOW_CLAUDE_CLI=true`, `CLAUDE_CLI_PATH` to the absolute executable path, and `CLI_PROFILE_ACKNOWLEDGED=true` after reviewing the restrictions below. `CLAUDE_MODEL` may be blank to use the CLI default. Restart, select ClaudeCLI and consent before sending. The app does not install the CLI or perform login.

The runner disables action tools, user MCP configuration, slash commands, browser integration and session persistence. It checks reported tools and rejects unexpected tool activity. These restrictions are not an operating-system sandbox; managed host policy or hooks may still apply. Review the host before enabling this mode. Auth files and tokens are not extracted by the app.

## CodexCLI

The in-app response runtime is disabled because its required restriction profile has not been verified. Codex can still be used separately as a coding tool.

## Verification status

The adapter tests use fake transports. No live OpenAI or subscription CLI model request has been verified for this release. Actual account access, model behavior and usage costs need a live check with permitted credentials. Cancelling locally may not prevent usage for a request already accepted by a provider.
