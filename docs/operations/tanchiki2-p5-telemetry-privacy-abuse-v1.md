# Tanchiki2 P5 Telemetry, Privacy, and Abuse Operations v1

Status: **IMPLEMENTED POLICY CANDIDATE; NOT RELEASE AUTHORITY OR LEGAL ADVICE**

Prepared: 2026-07-23

Exact implementation baseline: `67f059b897935b85f27d3e4fdaf6c4b006ea2308`

Working branch: `codex/tanchiki2-p5-telemetry-privacy-abuse-v1`

This is the minimum operational policy for the first invitation-only public preview. It makes a conservative decision now and leaves jurisdiction-specific legal review for the separately authorized release package.

## Decision

Application-level online session telemetry is **off for the public preview**.

- Production startup accepts neither `ONLINE_TELEMETRY_LOG_PATH` nor `ONLINE_TELEMETRY_INCLUDE_SENSITIVE=true`. Either setting fails closed before a room can be served.
- The Render Blueprint keeps the log path absent and the sensitive switch explicitly false.
- No account, profile, public matchmaking queue, arbitrary chat, voice service, or persistent progression is part of the online preview.
- Live rooms, room keys, reconnection reservations, callsigns, and match state remain process-memory data and disappear when the room is disposed or the process restarts.
- The server and network provider necessarily handle connection metadata while traffic is active. The application does not write that metadata to a production session log. Provider infrastructure logs are a separate provider-controlled surface that the release operator must verify and disclose before P6.

The player-readable notice is [`public/online-preview-privacy.html`](../../public/online-preview-privacy.html). Every preview invitation and release page must link it before a player creates or joins a room. The room-entry screen also states the two most important facts: chat is off and public-preview session telemetry is off.

## Collection map

| Surface | Public preview behavior | Purpose | Retention |
| --- | --- | --- | --- |
| Live room state | Held in server memory while the room exists | Run the private match, reconnect a dropped player, and produce one common result | Until room disposal or process restart |
| Browser session state | Callsign and reconnection token in that browser's session storage | Restore the current browser session | Browser-session lifetime; player can close the tab/browser session or clear site data |
| Application session telemetry | Disabled and production-locked | None in the first preview | No application record |
| Server lifecycle stdout | Revision, start/stop event, and aggregate private-room count only | Health and deployment diagnosis | Provider-controlled; verify the exact provider setting before release and do not make external copies by default |
| Local diagnostic JSONL | Explicit developer-only path, pseudonymous by default | Reproduce a bounded private playtest failure | Seven days maximum; one file per playtest and rotate at 5 MiB |
| Local sensitive diagnostic JSONL | Separate explicit local switch | Short, consented diagnosis when pseudonymous evidence is insufficient | Delete after diagnosis, 24 hours maximum |
| Abuse/incident case note | Minimal report supplied through the invitation channel | Triage a callsign or conduct incident | Thirty days after closure unless a human-authorized legal hold applies |

No default event contains room keys, callsigns, IP addresses, internal room/player/session IDs, per-tick input, positions, snapshots, or free text. The logger now accepts only registered event names and allowlisted fields, so a future caller cannot add an arbitrary field to ordinary telemetry by accident.

## Local diagnostic handling

Local telemetry remains available because it is useful before production. It is not a shadow production policy.

1. Tell all playtest participants before enabling it and state whether sensitive mode is required.
2. Create a new ignored path for one playtest, for example `output/online-telemetry/2026-07-23-session.jsonl`.
3. Start pseudonymous. Enable the sensitive switch only when the failure cannot be diagnosed otherwise.
4. Keep the file on the test operator's machine. Do not paste it into chat, a task, a PR, screenshots, CI artifacts, or the repository.
5. Stop capture after the reproduction. If a file approaches 5 MiB, stop and start a new file; do not build an unbounded archive.
6. Reduce any durable evidence to aggregates and remove keys, tokens, names, addresses, and internal identifiers.
7. Delete a sensitive file within 24 hours and every other local diagnostic file within seven days.

Before deletion, resolve and inspect the exact file path under the repository's ignored `output/online-telemetry/` directory. Do not run a recursive deletion against the workspace root. The operator who created the file is its only default accessor.

There is no automatic player-data export because the preview has no accounts or stable identity mapping. If a participant requests a copy or deletion, the maintainer records the request privately, verifies the session with information already available to that participant, and handles any existing local or incident record manually. Never ask for a room key, reconnection token, or IP address as proof.

## Callsigns and communication

Callsigns are anonymous display labels, not identities.

- Unicode is normalized with NFKC.
- Letters and numbers from supported scripts, spaces, `_`, and `-` are allowed.
- Markup, emoji, control characters, bidirectional overrides, and invisible formatting are removed.
- Repeated whitespace is collapsed, surrounding whitespace is removed, and the result is limited to 18 Unicode code points.
- An empty result becomes `Rookie`.

This mechanical validation is not an offensive-word filter. Automated blocklists are easy to evade and can incorrectly reject legitimate names. Human response is deliberately small and explicit.

Arbitrary chat remains absent from the UI, client protocol, authoritative server, snapshots, and telemetry. In-game communication is limited to the five fixed radio commands and bounded team map pings, each independently rate-limited.

## Abuse report and response

The first preview is invitation-only, so the report channel is the same private third-party channel used to invite the player. The P6 release operator must name one monitored contact in every invitation; no public preview starts without it.

Player procedure:

1. In the lobby, ask the host to use the existing Kick action for an abusive callsign.
2. During a live match, leave safely if continuing is uncomfortable; there is no free-text confrontation surface.
3. Report the callsign, approximate UTC time, and a short category: `CALLSIGN`, `GAMEPLAY DISRUPTION`, or `OTHER`.
4. Do not send the room key, reconnection token, IP address, telemetry file, or another player's private information.

Maintainer procedure:

1. Acknowledge the report through the same private channel and create a minimal case note with a random case ID.
2. Remove keys, tokens, addresses, and unnecessary narrative from the note.
3. For the active lobby, ask the host to kick the player. For later sessions, revoke or decline that participant's invitation. There is no claim of account-level banning because the preview has no accounts.
4. If the report indicates a security or immediate-safety incident, stop inviting players and request human authority before pausing a public service or changing provider settings.
5. Record outcome and deletion date. Delete the case note 30 days after closure unless a valid hold is approved.

No in-game report form is added: without accounts, a staffed queue, or durable protected storage it would imply a response system that does not exist and would itself create another free-text collection surface.

## Incident handling

For suspected exposure of a key, token, IP address, callsign list, or sensitive diagnostic file:

1. Stop the capture or reproduction and preserve only the minimum evidence needed to identify scope.
2. Do not post the material to GitHub, a task, CI, screenshots, or a public issue.
3. Record when the exposure started, where the data exists, who had access, and whether it was copied.
4. Rotate the room key by kicking the affected lobby participant or disposing the room. Reconnection tokens expire with their reservation/session; do not log them for investigation.
5. Delete unauthorized copies when safe, then re-run the repository secret/sensitive-output scan.
6. Escalate any production service pause, provider-log access, credential action, public notice, or legal decision to the human operator.

Telemetry failure must never affect authoritative gameplay. A privacy-control failure is different: production must fail closed rather than silently enable collection.

## Access, legal hold, and future activation

Only the test operator may access a local diagnostic file. Only the maintainer handling a specific report may access its case note. Provider administrators may have access to infrastructure logs under provider controls; P6 must record the actual administrators and retention before release.

There is no automated legal-hold feature. A request does not authorize broader capture. On a credible hold request, the maintainer must obtain human/legal direction, preserve only already-existing in-scope records, record a non-sensitive case reference, and suspend deletion only for those records. Never enable telemetry retroactively or preserve room keys/tokens merely because a hold was mentioned.

Production session telemetry can be activated only by a later, separately reviewed package that:

- names a concrete purpose and minimum event schema;
- updates the player notice before collection;
- provides protected storage, access audit, enforced rotation and deletion, and incident ownership;
- defines export/deletion and legal-hold procedures appropriate to the selected jurisdictions;
- proves that sensitive mode remains unavailable in ordinary production;
- receives explicit privacy/legal and production-setting approval.

Until all of those conditions are met, the production lockout is intentional behavior.

## P5 closeout boundary

This package does not provision Render, inspect or change provider settings, deploy a backend, publish GitHub Pages, create an abuse inbox, spend money, or perform legal analysis. Human WAN remains an independent release-acceptance gate.

Target terminal outcome:

`P5_TELEMETRY_PRIVACY_ABUSE_POLICY_IMPLEMENTED_PRODUCTION_TELEMETRY_DISABLED`
