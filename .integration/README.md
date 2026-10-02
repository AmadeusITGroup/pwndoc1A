# Amadeus integration branch

`main` tracks `pwndoc/pwndoc` upstream. `integration` starts at the pinned
`v1.7.0` commit in [sources.json](sources.json) and contains a linear series of
reviewed cherry-picks. Each imported commit retains its original source SHA in
the `-x` trailer. The manifest pins the PR heads and records the intended
commit order; the Git history contains the conflict resolutions.

The OIDC and webhook imports both add environment variables. Their overlap in
`.env.example` and `docker-compose.yml` was resolved in the first webhook
commit so both configurations are retained. The editor link fix requires the
upstream HTML-diff sanitization commit `4492d7c`, which is imported separately.

## Rebuild without changing integration

From this checkout, run:

```sh
scripts/rebuild-integration.sh
```

The script creates `integration-candidate` in a sibling worktree, replays the
commits from the recorded base, and checks that the final file tree matches
`integration`. It does not push or replace any branch. Pass a new upstream tag
or commit to try a base update:

```sh
scripts/rebuild-integration.sh upstream/main integration-next
```

If a new base already contains an imported change, or if a cherry-pick
conflicts, resolve or skip that commit in the candidate worktree and use
`git cherry-pick --continue` to finish the queued commits. Review the resulting
diff and tests before moving `integration`. Then update the base and source
entries in the manifest to reflect the new history. An exact rebuild is
automatic for the pinned base; an upstream base update needs review.

For another PR, fetch its head, inspect its commits, cherry-pick the selected
non-merge commits with `-x`, and add the pinned head and source SHAs to the
manifest. Keep deployment-specific changes in separate commits.
