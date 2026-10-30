# README GIF playback speed

Agent: `codex3`
Issue: #397
Branch: `agent/codex3/readme-gif-speed`
Base: `origin/main@af9feb4`

## Done

- Re-encoded the existing user-operated iOS Simulator recording at 1.7x instead
  of 2.5x so Review and Day content remains readable in the README.
- Preserved the 27-second source trim, 480x1042 dimensions, 10 fps, 96-color
  palette, and evidence boundary.
- Updated the README caption to match the actual playback rate.

## Verification

- GIF decoded successfully: 159 frames, 15.9 seconds, 4,790,618 bytes.
- No API key, source MOV, user photo, runtime source, model default, fixture,
  evaluator, or baseline was added or changed.

## Eval impact

None. Documentation media only; all measured results remain unchanged.

Traps: Keep the 27-second trim as an end boundary. Starting at second 27 would
leave only the final 2.7 seconds of the source recording. Playback rate in the
README caption must match the encoded GIF.
