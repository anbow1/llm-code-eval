Implement a tokenizer + recursive descent parser.

Tokens: NUMBER, NAME, + - * / ^ ( ) , . Skip whitespace. Then parse.

Grammar:
expr := unary (('+'|'-') unary)*
unary := ('+'|'-')* power
power := atom ('^' unary)?  — right-assoc, with unary allowed after ^. Actually -2^2 = -4 means unary binds looser than ^. So unary := ('+'|'-') unary | power. power := atom ('^' unary)? where exponent can include unary signs (2^-1). That gives -2^2 = (-2)^... wait: unary parses '-' then unary → power → atom=2, sees '^', parses unary → 2. So -(2^2) = -4. Good.

atom := NUMBER | NAME | function call | '(' expr ')'. Function call: NAME followed by '(' args ')'. "abs 3" → after parsing NAME abs, next token is NAME not '(' — but then trailing tokens: after parsing, we'd have leftover NAME token, which is a syntax error (trailing). Good — but spec says "abs 3" is ValueError; trailing token check handles it.

Check "1..2": tokenizer: number parsing. Tokenizer for numbers: digits with optional single dot, or dot followed by digits. "1..2" → scan "1." then next char '.' invalid → error. Or just tokenize "1." then "." unknown char → ValueError. Fine either way; but careful: "1." must tokenize as "1." (allowed per spec "7."). Use regex? Simpler: manual scan: if digit or '.', collect digits, optional one '.', digits. If '.' without digits before or after → error. Let's handle: at '.', require next is digit. ".5" ok. "1.." → collect "1." then '.' again — after collecting "1." we stop; next token starts with '.', which requires digit after; next char is '.', so error. Good.

Also Fraction("7.") works? Fraction("7.") → I think Fraction accepts "7." ? Fraction('7.') — Fraction's string parsing regex allows `\d+\.\d*`? Let me recall: Fraction's regex: `(?P<num>\d+)` etc with optional `/`, and it handles decimal via `_RATIONAL_FORMAT` which allows `\d+\.\d*`. Yes, Fraction("7.") works (returns 7). And Fraction(".5") works. But safer to just try Fraction(token) and catch → shouldn't happen given tokenizer.

Power: exponent must be integer: check exp.denominator != 1 → ValueError. Then Fraction ** int: for negative exp, 0 base → Fraction ** negative int with 0 base raises ZeroDivisionError ("0 cannot be raised to a negative power"). Actually Fraction(0) ** -1 raises ZeroDivisionError. Good. But careful: Fraction ** int returns Fraction. For huge exponents fine.

Functions: abs, min, max implemented via Fraction ops. abs works on Fraction. min/max work.

Variables: values are int or Fraction — convert int to Fraction, or just use as-is (Fraction ops with int work). But return must be Fraction — convert: Fraction(value). If value not int/Fraction? Spec says int or Fraction; still, wrap: if isinstance(value, Fraction) use it, elif int → Fraction(value), else maybe raise? Keep simple: Fraction(value) catches; but Fraction of Fraction works. If it's something else, error — just let Fraction raise, or raise ValueError. I'll do: try Fraction(value) except → ValueError? Spec doesn't require; keep it: convert with Fraction(value), letting TypeError propagate is fine but better to just use the value directly in arithmetic and convert at end? Simpler: val = variables[name]; return val if isinstance(val, Fraction) else Fraction(val). If that raises, let it.

Division: Fraction / Fraction handles zero division → ZeroDivisionError. Good.

Implement tokenizer producing list of (kind, value). Kinds: NUM (Fraction), NAME (str), and single-char ops.

Parser class with pos, peek, expect.

Write code.