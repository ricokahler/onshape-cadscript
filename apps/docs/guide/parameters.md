# Parameters

Use parameter specs for dimensions that may change after a test print:

```ts
parameters: {
  wall: lengthParam(2.4, { min: length(1.2), max: length(6) }),
  copies: numberParam(2, { min: 1, max: 8 }),
  mirrored: booleanParam(false),
  size: choiceParam("medium", ["small", "medium", "large"]),
}
```

Project overrides live in `cadscript.config.ts`. Unknown, non-finite, out-of-range, and invalid-choice values fail before any Onshape request.
