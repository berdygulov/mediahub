# /push — Git commit and push

Commit staged and unstaged changes, then push to the remote.

## Steps

1. Run `git status` and `git diff` (staged + unstaged) to see what changed.
2. Run `git log --oneline -5` to match the repo's commit message style.
3. Stage all modified tracked files: `git add -u`. If there are relevant untracked files, add them by name.
4. Write a commit message that:
   - Starts with an imperative verb (add, fix, update, remove, refactor…)
   - Describes **what** changed and **why** in 1–2 sentences
   - Contains **no** mention of AI, Claude, co-authors, or automated tools
5. Commit with the message passed via heredoc:
   ```
   git commit -m "$(cat <<'EOF'
   <message>
   EOF
   )"
   ```
6. Push to the current branch: `git push`.
7. Report the commit hash and branch name.

## Rules

- Never add `Co-Authored-By`, `Generated with`, or any AI attribution trailer.
- Never use `--no-verify`.
- If there is nothing to commit, say so and stop.
- If push is rejected (non-fast-forward), report the error and ask the user how to proceed — do not force-push.
