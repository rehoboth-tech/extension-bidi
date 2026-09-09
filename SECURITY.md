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

```bash
npm i github:rehoboth-tech/extension-bidi#v0.1.1                 # tag: convenient
# get the exact commit a tag points at:
#   git ls-remote https://github.com/rehoboth-tech/extension-bidi.git refs/tags/v0.1.1^{}
npm i github:rehoboth-tech/extension-bidi#<commit-sha>            # commit: exact
```

**A tag is a pointer, and pointers can be moved.** In March 2025 an attacker rewrote
every version tag of a widely used GitHub Action to point at malicious code; everyone
who had pinned a tag got the new code on their next run. The same shape happened again
in March 2026 across four more Actions. So:

- **We do not move published tags.** Every `vX.Y.Z` keeps pointing at the commit it pointed
  at when it was published; new content gets a new version number, never a moved tag. The repository has a rule that rejects a tag update, so this is enforced by
  GitHub, not only by our intentions.
- **If you want a guarantee that does not depend on us keeping that promise, pin the
  commit SHA.** A commit SHA is the content; it cannot be moved by anyone.

That is not a statement about this repository being untrustworthy — it is how you
should treat every dependency you did not write, including ours.

## Supported versions

The latest release on `main` is the supported one. This package is small enough
that backporting to older versions would be more ceremony than help.
