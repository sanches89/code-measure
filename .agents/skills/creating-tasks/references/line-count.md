# Line count

## The count tool

The count tool is `cloc`, from `github.com/AlDanial/cloc`. The count command
`<cloc>` is one of two forms:
- `cloc`, when `PATH` has it;
- otherwise `npx --yes cloc`. `npx` fetches the newest release into its own
  cache. It needs Node.js with npx, Perl 5, and network access on the first
  run.

Never install the count tool into the project. When the count command fails
to start, count by hand from the files, with the rule for code lines below.

## Code lines

A code line is a line that is neither blank nor a comment. `cloc` reports it
in the `code` field and leaves `blank` and `comment` out. The size of a
change is the code lines it adds, removes, or modifies, outside the test
locations that research recorded.

## Count the files the change deletes or rewrites

Run from the project root over those files. `--fullpath` makes both
exclusion regexes match the whole path. Write the recorded test locations
as Perl regular expressions: folders in `--not-match-d`, files in
`--not-match-f`. Leave an option out when there is nothing to exclude.

```bash
<cloc> --quiet --json --fullpath \
  --not-match-d='<test-folder-regex>' \
  --not-match-f='<test-file-regex>' \
  <path>...
```

`SUM.code` in the output is the code lines the change removes. Add to it the
estimate of the code lines it adds and modifies. Count each file once.
