I need to write a tokenizer and recursive-descent parser.

Grammar:
- expr := unary
- Actually precedence: unary minus binds looser than ^ on the left but tighter than * /. So:

power := unary? Let me define:
- primary := number | variable | function call | '(' expr ')'
- power := primary ('^' signed_power)?  — right associative, exponent can have unary sign
- unary := ('+'|'-')* power  — hmm, but -2^2 = -4 means unary applies after power: unary := ('-'|'+') unary | power. And power's RHS: after ^, allow signed exponent: 2^-1. So power := unary_primary ... Let me define:

atom := number | var | func | ( expr )
power := atom [ ^ sign_power ]  where sign_power := ('+'|'-')* power? Actually 2^-1^2? 2^(-1)^2... right associative: 2^-1^2 = 2^((-1)^2)? Hmm, ambiguous. Keep simple: after ^, parse unary-minus-allowed power: exp := ('+'|'-')* power. That makes 2^-1^2 parse as 2^((-1)^(2))... Actually ('-'|'+')* power where power = atom ['^' exp], so 2 ^ -1 ^ 2 → exponent parses "-1^2" = -(1^2) = -1, so 2^(-1) = 1/2. Fine either way; spec doesn't test that.

term := power (('*'|'/') power)*
expr := term (('+'|'-') term)*
unary: I need -2^2 = -4. So unary applies at term level: term := ('+'|'-')* ... hmm. Let's define:

unary := ('+'|'-') unary | power
power := atom ['^' unary_power] where unary_power := ('+'|'-') unary_power | atom... but then -2^2: parse unary: sees '-', recurse unary → power → atom 2, then ^ → exponent unary_power → atom 2. Result: -(2^2) = -4. Good. And 2^-1: atom 2, ^, unary_power: '-' then atom 1 → -(1) → 2^(-1). Good.

term := unary (('*'|'/') unary)*
expr := term (('+'|'-') term)*

Functions: name followed by '(' args ')'. Function call is an atom. But "abs 3" -> error since abs not followed by '(' — then "abs" as variable? abs matches variable name pattern; if not in variables → NameError? Spec says "abs 3" -> ValueError. Hmm. Unknown name → NameError. "abs" unknown → NameError would conflict with spec saying ValueError for "abs 3". Tricky. Maybe: if identifier is a known function name not followed by '(' → ValueError. Or treat as variable lookup → NameError. The spec lists "abs 3" under ValueError. So: identifiers that are function names (abs/min/max) must be followed by '(', else ValueError. Other identifiers → variables lookup, unknown → NameError.

Tokenizer: numbers with regex like (\d+(\.\d*)?|\.\d+). "7." valid → Fraction("7.")? Fraction("7.") works? Fraction accepts "7." I believe Fraction("7.") = 7. Yes, Fraction's string parser handles "7.". "1..2" → tokenizes "1." then ".2" → two numbers adjacent → "2 3"-like error at parse. Good, tokenizer emits two NUMBER tokens, parser sees NUMBER NUMBER → error.

Actually careful: "1..2" — regex \d+(\.\d*)? matches "1." then ".2" matches \.\d+. Two adjacent number tokens → parser error since after primary, next token is NUMBER, not operator → trailing tokens error. Good.

Tokens: NUMBER, NAME, OP(+ - * / ^), LPAREN, RPAREN, COMMA, EOF. Skip whitespace.

Unknown characters → ValueError at tokenize.

Power exponent integer check: exponent value must be Fraction with denominator 1 → int. Compute: if exp < 0: base**exp needs base nonzero else ZeroDivisionError; Fraction ** negative int works if base nonzero? Fraction(0) ** -1 → ZeroDivisionError automatically. Fraction ** int returns Fraction (if int exponent). Actually Fraction ** int gives Fraction. For negative exponent with 0 base, Python raises ZeroDivisionError. Good. But to be safe: if exponent.denominator != 1 → ValueError. Then use int exponent: result = base ** exp_int. Fraction(2) ** -1 → Fraction(1,2). Fraction(0)**-1 → ZeroDivisionError. Good.

min/max/abs with Fractions: abs works, min/max work.

Variables values int or Fraction → convert with Fraction(value).

Edge: unary plus repeat: '+' fine.

Write code.

def evaluate(expr, variables=None):
    tokens = tokenize
    parser class or closures with index.

Implement with index list.

Handle function names check: NAME token whose value in ('abs','min','max') must be followed by LPAREN. Also what about using "min" as variable name if user passes variables={'min': ...}? Probably treat function names reserved. Simplest: if name in functions and next is '(' → call; if name in functions and next != '(' → ValueError. Else variable.

Empty input → EOF at start → expr parse error → ValueError.

Code:

import re
from fractions import Fraction

_TOKEN_RE = re.compile(r"\s*(?:(\d+(?:\.\d*)?|\.\d+)|([A-Za-z_][A-Za-z0-9_]*)|([+\-*/^(),]))")

Tokenize loop: pos=0; while pos < len: match at pos; if no match or match group None → error. Whitespace only at end: r"\s*" then requires one of the alternatives; trailing whitespace: after loop handle remaining whitespace: use matched = _TOKEN_RE.match(s, pos); if not matched: check if s[pos:].strip()=='' → break else error. Simpler: strip whitespace handling: match = regex.match(s,pos); if match: pos = match.end(); groups... but if only whitespace remains, regex won't match since needs a token. So: skip whitespace manually first: while pos<len and s[pos].isspace(): pos+=1; if pos>=len: break. Then match token regex without leading \s*.

Parser:

class _Parser with tokens list of (kind, value).

def parse(self):
    node = self.expr()
    if self.peek kind != EOF: raise ValueError
def expr: term (('+'|'-') term)*
def term: unary (('*'|'/') unary)*
def unary: if tok in (+,-): op; operand = self.unary(); return ±operand; else return self.power()
def power: base = self.atom(); if peek '^': consume; exp = self.upower(); return base ** exp checked
def upower: if tok in (+,-): op; return ±self.upower(); else return self.atom()
def atom: NUMBER → Fraction(text); NAME → function or variable; '(' → expr, expect ')'.

Check exponent integer: if not isinstance(exp, Fraction) — all are Fractions. if exp.denominator != 1: raise ValueError. e = exp.numerator (int). return base ** e.

Wait: base ** e where e int: Fraction ** int → Fraction. But 0 ** negative: Fraction(0) ** Fraction(-1)? We pass int so Fraction(0)**(-1) raises ZeroDivisionError. Good.

Function call: consume NAME, expect '(', parse args: if peek is ')': for abs → error (needs exactly 1); min/max → error (needs ≥1). Else parse expr, then while ',' parse expr, expect ')'. Count args: abs 1 else ValueError; min/max ≥1.

Variables: variables or {}. value = variables.get(name) — if name not present → NameError(name). Convert: Fraction(value). Also if value is something else (e.g. str)? Spec says int or Fraction; Fraction(value) handles both; could raise TypeError—fine to let propagate or convert. I'll just do Fraction(value).

Division: Fraction / Fraction with zero denominator → ZeroDivisionError automatically. Good.

Return Fraction results always.

Write the final code.