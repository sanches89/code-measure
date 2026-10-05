#!/usr/bin/env node
// Lists text signals of the Agent-written code, Legibility, and Tests entries
// of references/smell-catalog.md as path:line, by kind. A signal is a line
// to read, never a finding: the catalog entry says what makes it one.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, resolve, sep } from 'node:path';

const HELP = `Usage: scan.mjs <path>... [options]

Reads the code files under the paths and prints one JSON document with the
signals of the smell catalog, by kind, each as file, line, and text.

Options:
  --ignore "<glob>,<glob>"  Globs of generated and vendored code to leave out.
                            node_modules, vendor, .git, and build output are
                            left out without an option.
  --max-lines <n>           Length over which a file is an oversized-file.
                            Default 400.
  --top <n>                 Entries kept per kind. Default 50.
  --kinds <kind>,<kind>     Kinds to scan. Default all:
                            ${'KINDS'}
  -h, --help                Print this help.

Exit codes: 0 signals printed, 1 unexpected failure, 2 invalid arguments.

Example:
  node scan.mjs src lib --ignore "**/generated/**" > scan.json
`;

const KINDS = [
  'boundary-in-logic', 'implicit-wiring', 'masked-error', 'placeholder',
  'compat-path', 'hard-coded-value', 'credential', 'oversized-file',
  'skipped-test', 'weak-assertion',
];

const CODE_EXT = new Set([
  '.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx', '.mts', '.cts', '.vue',
  '.svelte', '.py', '.go', '.rb', '.php', '.java', '.kt', '.kts', '.cs',
  '.swift', '.rs', '.scala', '.groovy', '.c', '.h', '.cpp', '.hpp', '.cc',
  '.m', '.mm', '.dart', '.ex', '.exs', '.lua', '.pl', '.sh', '.bash', '.zsh',
  '.ps1',
]);

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'vendor', 'dist', 'build', 'out', 'target',
  'coverage', '.next', '.nuxt', '__pycache__', '.venv', 'venv', '.tox', 'obj',
]);

const TEST_PATH = /(^|\/)(tests?|__tests__|specs?|testing)\//;
const TEST_FILE = new RegExp([
  '\\.(test|spec)\\.[cm]?[jt]sx?$', '_test\\.(go|py|rb|rs|php|ex|exs|dart)$',
  '(^|/)test_[^/]*\\.py$', 'Tests?\\.(java|kt|cs|swift|scala|groovy)$',
  '_spec\\.rb$', 'Spec\\.(scala|kt|groovy)$', 'Test\\.php$',
].join('|'));

const COMMENT_LINE = /^\s*(\/\/|#|\*|\/\*|--|<!--|''')/;
const DECLARATION = new RegExp(
  '^\\s*(export\\s+|public\\s+|private\\s+|protected\\s+|static\\s+|final\\s+' +
  '|readonly\\s+|const\\s+|let\\s+|var\\s+|val\\s+|#define\\s+' +
  '|[A-Za-z_][\\w<>\\[\\].]*\\s+)*[A-Za-z_]\\w*\\s*(:\\s*[\\w<>\\[\\]|.]+\\s*)?' +
  '(=(?!=)|\\s)\\s*[^=]',
);

// One regex per kind, run per line. A `test` flag limits the kind to test
// files, `code` to the other files. `skipComments` and `skipDeclarations`
// drop lines that name the literal they hold.
const LINE_KINDS = {
  'boundary-in-logic': {
    code: true,
    patterns: [new RegExp([
      '\\bDate\\.now\\(', '\\bnew Date\\(\\s*\\)', '\\bMath\\.random\\(',
      '\\bprocess\\.env\\b', '\\bcrypto\\.random\\w*\\(', '\\bfetch\\(',
      '\\baxios\\.', '\\bhttps?\\.(request|get)\\(',
      "require\\(['\"](node:)?(fs|fs/promises|http|https|child_process)['\"]\\)",
      "from ['\"](node:)?(fs|fs/promises|http|https|child_process)['\"]",
      '\\bdatetime\\.(now|utcnow|today)\\(', '\\bdate\\.today\\(',
      '\\btime\\.time\\(', '\\brandom\\.\\w+\\(', '\\bos\\.environ\\b',
      '\\bos\\.getenv\\(', '(?<![\\w.])open\\(', '\\brequests\\.\\w+\\(',
      '\\bhttpx\\.', '\\burllib\\.', '\\bsubprocess\\.', '\\btime\\.Now\\(',
      '\\brand\\.\\w+\\(', '\\bos\\.Getenv\\(',
      '\\bos\\.(Open|ReadFile|WriteFile|Create)\\(',
      '\\bhttp\\.(Get|Post|NewRequest)\\(', '\\bexec\\.Command\\(',
      '\\bSystem\\.currentTimeMillis\\(',
      '\\b(LocalDate|LocalDateTime|Instant|ZonedDateTime)\\.now\\(',
      '\\bnew Random\\(', '\\bSystem\\.getenv\\(',
      '\\bDateTime\\.(Now|UtcNow)\\b',
      '\\bEnvironment\\.GetEnvironmentVariable\\(', '\\bnew HttpClient\\(',
      '\\bFile\\.(ReadAll\\w*|WriteAll\\w*|Exists)\\(', '\\bTime\\.now\\b',
      '\\bDate\\.today\\b', '\\bENV\\[', '\\bFile\\.(read|write|open)\\(',
      '\\bNet::HTTP\\b', '\\bgetenv\\(', '\\bfile_get_contents\\(',
      '\\bcurl_\\w+\\(', '\\bSystemTime::now\\(', '\\bInstant::now\\(',
      '\\benv::var\\(', '\\bfs::(read|write)\\w*\\(', '\\breqwest::',
    ].join('|'))],
  },
  'implicit-wiring': {
    code: true,
    patterns: [new RegExp([
      '\\bgetattr\\(', '\\bsetattr\\(', '\\bglobals\\(\\)\\s*\\[',
      '\\b__import__\\(', '\\bimportlib\\.import_module\\(',
      '\\bReflect\\.\\w+\\(', '(?<![\\w.])eval\\(', '\\bnew Function\\(',
      '\\bClass\\.forName\\(', '\\bActivator\\.CreateInstance\\(',
      '\\bType\\.GetType\\(', "\\bGetMethod\\(\\s*['\"]", '\\bmethod_missing\\b',
      '\\bdefine_method\\b', '\\bconst_get\\(', '\\binstance_variable_get\\(',
      '\\bpublic_send\\(', '\\bclass_eval\\b', '\\binstance_eval\\b',
      '\\bcall_user_func(_array)?\\(', '\\$this->\\$\\w+\\(',
      '\\breflect\\.(ValueOf|TypeOf)\\(', '\\bmonkeypatch\\b',
    ].join('|'))],
  },
  placeholder: {
    patterns: [new RegExp([
      '\\b(TODO|FIXME|XXX|HACK)\\b', '\\bNotImplementedError\\b',
      '\\bNotImplementedException\\b', '\\bunimplemented!\\s*\\(',
      '\\btodo!\\s*\\(', "\\bpanic\\(\\s*[\"'](TODO|not implemented|unimplemented)",
      "throw new Error\\(\\s*['\"`]not implemented",
    ].join('|'), 'i')],
  },
  'compat-path': {
    patterns: [
      /\b(legacy|deprecated|backwards?[_-]?compat\w*|compat|compatibility|fallback)\b/i,
      /\b\w+_old\b|\bold_\w+|\b[a-z]\w*Old\b|\bOld[A-Z]\w+|\bOLD_\w+/,
    ],
  },
  'hard-coded-value': {
    code: true,
    skipComments: true,
    skipDeclarations: true,
    patterns: [
      /https?:\/\/[^\s'"`)]+/,
      /['"](\/(etc|home|usr|var|tmp|opt|srv)\/[^'"]*|[A-Za-z]:\\[^'"]*)['"]/,
      /(?<![\w.#x$-])(?!0+\b)\d{3,}(?:\.\d+)?(?![\w.%])/,
    ],
  },
  credential: {
    hide: true,
    patterns: [
      new RegExp(
        '\\b(api[_-]?key|apikey|secret|password|passwd|pwd|token|private[_-]?key' +
        "|client[_-]?secret|access[_-]?key)\\w*\\s*[:=]\\s*['\"`][^'\"`\\s]{8,}['\"`]",
        'i',
      ),
      /-----BEGIN (RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/,
      new RegExp(
        '\\bAKIA[0-9A-Z]{16}\\b|\\bgh[opusr]_[A-Za-z0-9]{36}\\b' +
        '|\\bsk-[A-Za-z0-9_-]{20,}\\b|\\bxox[baprs]-[A-Za-z0-9-]{10,}\\b' +
        '|\\bAIza[0-9A-Za-z_-]{35}\\b',
      ),
    ],
  },
  'skipped-test': {
    test: true,
    patterns: [new RegExp([
      '\\.(skip|only|todo)\\(', '\\b(xit|xdescribe|xtest|fit|fdescribe|ftest)\\(',
      '@pytest\\.mark\\.(skip|skipif|xfail)', '@unittest\\.skip',
      '\\bpytest\\.skip\\(', '@Ignore\\b', '@Disabled\\b',
      '\\bt\\.Skip(f|Now)?\\(', '#\\[ignore\\]', '\\bpending\\s*(\\(|do\\b)',
      '\\bskip:\\s*true', '->markTest(Skipped|Incomplete)\\(',
      "^\\s*skip\\s+['\"]",
    ].join('|'))],
  },
  'weak-assertion': {
    test: true,
    patterns: [new RegExp([
      '\\.toBeDefined\\(\\)', '\\.toBeTruthy\\(\\)', '\\.toBeFalsy\\(\\)',
      '\\.not\\.toThrow\\(\\)', '\\.not\\.toBeNull\\(\\)',
      '\\.not\\.toBeUndefined\\(\\)', '\\.toHaveBeenCalled\\(\\)',
      '\\bassertIsNotNone\\(', '\\bassertTrue\\(\\s*True\\s*\\)',
      '\\bassert\\s+\\w[\\w.\\[\\]]*\\s+is\\s+not\\s+None\\b',
      '^\\s*assert\\s+\\w[\\w.\\[\\]]*\\s*$', '\\bassertNotNull\\(',
      '\\bassertDoesNotThrow\\(', '\\b(assert|require)\\.NotNil\\(',
      '\\bAssert\\.(IsNotNull|NotNull|DoesNotThrow)\\(', '\\bassert_not_nil\\b',
      '\\brefute_nil\\b', '\\.to be_truthy\\b', '\\.not_to raise_error\\b',
      '\\bassertNotEmpty\\(',
    ].join('|'))],
  },
};

// Patterns that span lines, run on the whole file content.
const MASKED_ERROR = [
  /catch\s*(\([^)]*\))?\s*\{\s*(\/\/[^\n]*\s*|\/\*[\s\S]*?\*\/\s*)*\}/g,
  new RegExp(
    'catch\\s*(\\([^)]*\\))?\\s*\\{\\s*(console\\.(log|warn|error|debug)' +
    '|log(ger)?\\.\\w+|print(ln)?|System\\.(out|err)\\.print\\w*|logging\\.\\w+' +
    '|Log\\.\\w+|_logger\\.\\w+)\\([^;\\n]*\\);?\\s*\\}',
    'g',
  ),
  /catch\s*(\([^)]*\))?\s*\{\s*return\b[^;\n]*;?\s*\}/g,
  /\.catch\(\s*(\(\s*\w*\s*\)|\w+)?\s*=>\s*\{\s*\}\s*\)/g,
  /\.catch\(\s*\(\s*\w*\s*\)\s*=>\s*(null|undefined|false|\[\]|\{\})\s*\)/g,
  /^[ \t]*except(\s+[^:\n]+)?:\s*\n[ \t]*(pass|continue|return\b[^\n]*)\s*$/gm,
  /^[ \t]*except\s*:\s*$/gm,
  /\brescue\b[^\n]*\n[ \t]*(nil|end)\b/g,
  /\brescue\s+nil\b/g,
  /(?:^|\n)[ \t]*_\s*=\s*err\b/g,
  /if\s+err\s*!=\s*nil\s*\{\s*\n?\s*(return\s+nil\s*;?|continue|\})/g,
];

function fail(message, code) {
  process.stderr.write(`scan.mjs: ${message}\n`);
  process.exit(code);
}

function parseArgs(argv) {
  const options = { paths: [], ignore: [], maxLines: 400, top: 50, kinds: KINDS };
  const positive = (name, value) => {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1) fail(`${name} needs a positive integer, got "${value}"`, 2);
    return n;
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) fail(`${arg} needs a value`, 2);
      i += 1;
      return argv[i];
    };
    if (arg === '-h' || arg === '--help') {
      process.stdout.write(HELP.replace('KINDS', KINDS.join(', ')));
      process.exit(0);
    } else if (arg === '--ignore') {
      options.ignore = next().split(',').map((g) => g.trim()).filter(Boolean);
    } else if (arg === '--max-lines') {
      options.maxLines = positive(arg, next());
    } else if (arg === '--top') {
      options.top = positive(arg, next());
    } else if (arg === '--kinds') {
      options.kinds = next().split(',').map((k) => k.trim()).filter(Boolean);
      const unknown = options.kinds.filter((k) => !KINDS.includes(k));
      if (unknown.length) fail(`unknown kind ${unknown.join(', ')}. Kinds: ${KINDS.join(', ')}`, 2);
    } else if (arg.startsWith('-')) {
      fail(`unknown option ${arg}. Run with --help for the options.`, 2);
    } else {
      options.paths.push(arg);
    }
  }
  if (!options.paths.length) fail('no path given. Usage: scan.mjs <path>... [options]', 2);
  for (const p of options.paths) {
    try { statSync(p); } catch { fail(`path does not exist: ${p}`, 2); }
  }
  return options;
}

function globToRegExp(glob) {
  let source = '';
  for (let i = 0; i < glob.length; i += 1) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') {
      i += 1;
      if (glob[i + 1] === '/') { i += 1; source += '(?:.*/)?'; } else source += '.*';
    } else if (c === '*') source += '[^/]*';
    else if (c === '?') source += '[^/]';
    else source += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  const anchored = glob.startsWith('**') || glob.startsWith('/') ? '' : '(?:.*/)?';
  return new RegExp(`^${anchored}${source}$`);
}

function toPosix(path) {
  return path.split(sep).join('/');
}

function* walk(path, ignore) {
  const stat = statSync(path);
  if (stat.isFile()) { yield path; return; }
  if (!stat.isDirectory()) return;
  const entries = readdirSync(path, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const full = join(path, entry.name);
    const rel = toPosix(relative(process.cwd(), full));
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      if (ignore.some((re) => re.test(rel) || re.test(`${rel}/`))) continue;
      yield* walk(full, ignore);
    } else if (entry.isFile()) {
      if (ignore.some((re) => re.test(rel))) continue;
      yield full;
    }
  }
}

function isCodeFile(path) {
  const ext = extname(path).toLowerCase();
  return CODE_EXT.has(ext) && !/\.min\.(js|css)$/.test(path);
}

function isTestFile(rel) {
  return TEST_PATH.test(rel) || TEST_FILE.test(rel);
}

function lineStarts(content) {
  const starts = [0];
  for (let i = 0; i < content.length; i += 1) if (content[i] === '\n') starts.push(i + 1);
  return starts;
}

function lineOf(starts, index) {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= index) lo = mid; else hi = mid - 1;
  }
  return lo + 1;
}

function cut(text) {
  const t = text.trim();
  return t.length > 120 ? `${t.slice(0, 117)}...` : t;
}

function scanFile(full, rel, options, signals) {
  if (statSync(full).size > 2_000_000) return false;
  const content = readFileSync(full, 'utf8');
  if (content.slice(0, 1000).includes('\0')) return false;
  const test = isTestFile(rel);
  const lines = content.split('\n');
  const add = (kind, line, text) => {
    const bucket = signals[kind];
    bucket.count += 1;
    if (bucket.top.length < options.top) bucket.top.push({ file: rel, line, text });
  };
  if (options.kinds.includes('oversized-file') && lines.length > options.maxLines) {
    const tokens = Math.round(content.length / 4);
    add('oversized-file', 1, `${lines.length} lines, about ${tokens} tokens`);
  }
  for (const kind of options.kinds) {
    const spec = LINE_KINDS[kind];
    if (!spec) continue;
    if (spec.test && !test) continue;
    if (spec.code && test) continue;
    lines.forEach((line, i) => {
      if (line.length > 500) return;
      if (spec.skipComments && COMMENT_LINE.test(line)) return;
      if (spec.skipDeclarations && (DECLARATION.test(line) || /^\s*(import|from|require|use|using|package)\b/.test(line))) return;
      if (spec.patterns.some((re) => re.test(line))) add(kind, i + 1, spec.hide ? '<hidden>' : cut(line));
    });
  }
  if (options.kinds.includes('masked-error')) {
    const starts = lineStarts(content);
    const seen = new Set();
    for (const re of MASKED_ERROR) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(content)) !== null) {
        const line = lineOf(starts, m.index + (m[0].match(/^\s*/)[0].length));
        if (!seen.has(line)) {
          seen.add(line);
          add('masked-error', line, cut(lines[line - 1] ?? m[0]));
        }
        if (m[0].length === 0) re.lastIndex += 1;
      }
    }
  }
  return true;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const ignore = options.ignore.map(globToRegExp);
  const signals = Object.fromEntries(options.kinds.map((k) => [k, { count: 0, top: [] }]));
  let files = 0;
  for (const path of options.paths) {
    for (const full of walk(resolve(path), ignore)) {
      if (!isCodeFile(full)) continue;
      const rel = toPosix(relative(process.cwd(), full));
      if (scanFile(full, rel, options, signals)) files += 1;
    }
  }
  if (signals['oversized-file']) {
    signals['oversized-file'].top.sort((a, b) => parseInt(b.text, 10) - parseInt(a.text, 10));
  }
  const result = {
    version: 1,
    settings: {
      paths: options.paths, ignore: options.ignore, maxLines: options.maxLines,
      top: options.top, kinds: options.kinds,
    },
    files,
    signals,
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

try {
  main();
} catch (error) {
  fail(error && error.message ? error.message : String(error), 1);
}
