#!/usr/bin/env bash
set -euo pipefail

# Replay the reviewed integration commits in a separate worktree. The source
# branch remains untouched, even if a newer upstream base causes conflicts.

if [[ $# -gt 3 ]]; then
  echo "Usage: $0 [target-base] [candidate-branch] [worktree-path]" >&2
  exit 2
fi

repo_root=$(git rev-parse --show-toplevel)
source_ref=${INTEGRATION_SOURCE_REF:-integration}
source_commit=$(git -C "$repo_root" rev-parse --verify "$source_ref^{commit}")
base_commit=$(git -C "$repo_root" show "$source_ref:.integration/sources.json" |
  python3 -c 'import json,sys; print(json.load(sys.stdin)["base"]["commit"])')

git -C "$repo_root" cat-file -e "$base_commit^{commit}"
if ! git -C "$repo_root" merge-base --is-ancestor "$base_commit" "$source_commit"; then
  echo "Recorded base is not an ancestor of $source_ref" >&2
  exit 1
fi
if [[ -n $(git -C "$repo_root" rev-list --merges "$base_commit..$source_commit") ]]; then
  echo "Integration contains merge commits; review the replay order manually" >&2
  exit 1
fi

target_base=${1:-$base_commit}
target_commit=$(git -C "$repo_root" rev-parse --verify "$target_base^{commit}")
candidate_branch=${2:-integration-candidate}
candidate_path=${3:-$(dirname "$repo_root")/${candidate_branch//\//-}}

git -C "$repo_root" check-ref-format --branch "$candidate_branch" >/dev/null
if git -C "$repo_root" show-ref --verify --quiet "refs/heads/$candidate_branch"; then
  echo "Branch already exists: $candidate_branch" >&2
  exit 1
fi
if [[ -e $candidate_path ]]; then
  echo "Path already exists: $candidate_path" >&2
  exit 1
fi

mapfile -t commits < <(git -C "$repo_root" rev-list --reverse "$base_commit..$source_commit")
git -C "$repo_root" worktree add --quiet -b "$candidate_branch" "$candidate_path" "$target_commit"
echo "Replaying ${#commits[@]} commits onto $target_commit in $candidate_path"

if ! git -C "$candidate_path" cherry-pick "${commits[@]}"; then
  echo "Replay stopped. Resolve the conflict, then run:" >&2
  echo "  git -C '$candidate_path' cherry-pick --continue" >&2
  echo "The candidate retains the remaining commits in Git's sequencer." >&2
  exit 1
fi

if [[ $target_commit == "$base_commit" ]]; then
  if ! git -C "$repo_root" diff --quiet "$source_commit" "$candidate_branch"; then
    echo "Rebuild completed, but its tree differs from $source_ref" >&2
    exit 1
  fi
  echo "Exact-base rebuild verified: candidate tree matches $source_ref"
else
  echo "New-base candidate ready. Review its diff and run tests before updating integration."
fi
echo "Candidate: $candidate_branch ($candidate_path)"
