# Security

## Reporting a vulnerability

Email **support@rehobothbuilds.com**. A person reads it.

Please include what you did, what happened, and what you expected. If you have a
proof of concept, a minimal one is more useful than a complete one. We will reply
to say we received it; we will not ask you to sign anything before you report.

We do not run a bug bounty, and we will not pretend otherwise.

## What this package is, and what that means for you

`extension-bidi` is a handful of pure functions. It has **no dependencies**, makes
**no network calls**, and reads no storage — you can verify all three by reading
`src/index.js`, which is under 200 lines. There is no build step: what is in this
repository is what runs.

## Pin what you install

The install lines in the README and `SKILL.md` fetch from a branch. A branch moves.
If you want a byte you have reviewed to stay the byte you get, pin a tag or a commit:

```bash
npm i github:rehoboth-tech/extension-bidi#v0.1.0
```

That is not a statement about this repository being untrustworthy — it is how you
should treat every dependency you did not write, including ours.

## Supported versions

The latest release on `main` is the supported one. This package is small enough
that backporting to older versions would be more ceremony than help.
