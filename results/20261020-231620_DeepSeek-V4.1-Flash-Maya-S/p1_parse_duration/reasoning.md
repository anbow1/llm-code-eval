We need answer with single python code block complete solution. Need function parse_duration. Need consider all rules and edge cases. Only stdlib. No tests/printing/input.

We need craft robust parser.

Spec:
- Part <non-negative integer><unit> no space between. Units d,h,m,s lower. Order d,h,m,s, each at most once. Any subset. Parts may written together or separated by one or more spaces. Leading/trailing whitespace allowed. No normalization. Anything else ValueError: empty/blank, unknown unit, wrong order, repeated unit, missing number, number without unit, decimals, signs, uppercase units, other separators.

Need decide syntax. Could parse by scanning tokens separated by spaces? Since parts may together "1h30m"; separated by spaces "1h 30m". Need allow leading/trailing whitespace. "parts may be written together or separated by one or more spaces" Means between parts either no space or one+ spaces. Cannot have spaces within a part between number/unit. Could have multiple spaces between parts. No other whitespace? Leading/trailing whitespace allowed likely any whitespace? "Leading/trailing whitespace" probably str.strip and regex. But Python str whitespace includes tabs/newlines; "other separators" invalid. Should we allow all whitespace or only ASCII spaces? Rule says "one or more spaces" and leading/trailing whitespace. To be safe, use only space? They say leading/trailing whitespace, could include tabs? Usually whitespace. But "other separators" invalid. Need parse duration string. Input examples with space. If we use \s, tabs/newlines between parts may be accepted, which might violate "spaces". But "leading/trailing whitespace" allows trim. The phrase "one or more spaces" could mean literal spaces. Unknown. Need infer from problem likely generated. We can use regex with ` ` only between parts, and strip whitespace? If strip allows tabs leading/trailing, okay. But if interior tab, invalid. Could regex fullmatch on `^\s*...`?

Let's design parser manually maybe.

Approach:
- Validate s is str? Signature s: str. Could raise ValueError if not? Not specified. If non-str, maybe TypeError naturally. We can just assume str; if not, operations fail. Maybe ensure `isinstance` and ValueError? Not needed.
- Handle empty/blank: after strip, if empty raise ValueError.
- Need parse sequence of parts. A part: digits + unit. Spaces can appear only between parts and leading/trailing. Parts can be adjacent.
- Since units order nondecreasing in d,h,m,s. Each at most once.

Simplest: Strip s. If empty invalid.
Use regex fullmatch: `(?:(\d+)([dhms])(?: +|$))*`? Need avoid trailing spaces after strip. Could parse with a loop.

Manual scanning:
```
def parse_duration(s):
    if not isinstance(s, str): raise ValueError? 
    t = s.strip()
    if not t: raise ValueError
    total = 0
    last_unit_rank = -1
    i = 0
    n = len(t)
    seen = set()
    first = True
    while i < n:
        # optional spaces? leading already stripped, but between parts.
        if t[i] == ' ':
            # spaces only between parts, not at beginning/end after strip. Could allow multiple.
            # but cannot occur inside part. We handle after parsing part.
        # parse number digits
        start = i
        while i<n and t[i].isdigit(): i++
        if start == i: invalid (missing number)
        # Need digits only ASCII? str.isdigit accepts Unicode digits. Rule non-negative integer likely ASCII digits. Use '0' <= c <= '9'. To avoid decimals etc.
        num_str = t[start:i]
        # next char unit; missing invalid
        if i>=n or t[i] not in 'dhms': invalid
        unit=t[i]; i+=1
        # check order and repeat
        rank = ...
        if rank <= last? Since each at most once and order d,h,m,s strictly increasing. If repeated rank equal invalid. Use last_rank >= rank invalid.
        # add
        total += int(num_str)*seconds[unit]
        last_rank = rank
        # after unit, can be end or spaces then next part or immediately next part.
        # If i<n and t[i]==' ', consume one or more spaces. After spaces must not end? Since stripped leading/trailing, if trailing spaces were stripped none. But if internal spaces at end? t.strip removes trailing, so no. However if we allow internal after unit then no part invalid e.g. "1h " stripped to "1h" valid. "1h  " trailing spaces allowed -> strip valid. Good.
        if i<n:
            if t[i]==' ':
                # consume spaces
                while i<n and t[i]==' ': i+=1
                if i>=n: # shouldn't due strip but if weird
                    raise ValueError? Actually after stripping no trailing, but if there is leading? Suppose s="1h  " -> t="1h", i=end. okay. If we didn't strip? We do.
                # need next part starts after spaces, but loop will parse next. If next char invalid number, invalid. Could have multiple spaces.
            else:
                # next char must start next number? Since no space, loop will parse. If it is invalid (e.g. 'x') then at number parse missing number -> invalid. If it's digit okay. If it's unit directly (missing number "h") invalid.
                pass
    return total
```
But need ensure spaces only between parts; our loop consumes spaces after unit and then requires next part. If multiple spaces okay. If space after number before unit "1 h" -> after digits char is space, not unit -> invalid. Good. If a space at start stripped. If leading spaces allowed. If trailing after unit stripped. If s only spaces -> t empty invalid.

Need handle order. We can map ranks: d=0,h=1,m=2,s=3. Check `rank <= last_rank`. Since no parts initially last_rank=-1. This enforces strict order. If "1h1h" rank 1 <=1 invalid. "1h1d" rank 0<=1 invalid. "1d1d" invalid. "1d1h1m1s" valid. "1h1d" invalid.

Need no decimals signs uppercase unknown. Manual digits/unit handles. "1h30m" parse: after 1h i points '3' no space, loop parse. Good. "1d4s" order d then s rank 0 then 3, valid. "4s1d" invalid.

Need "no normalization" "90m" => int 90 * 60.

Potential issue: Unicode digits. Should we disallow? "non-negative integer" could be interpreted [0-9]+. Use ASCII digits. If input "١h" Arabic digit, should be invalid? likely. Use `c in "0123456789"`.

Leading/trailing whitespace: `s.strip()` strips any whitespace including newlines/tabs. If interior tabs between parts: loop only consumes literal spaces, then if next is tab after unit, not space, goes to parse number at tab -> missing number invalid. Good. If leading tab, strip removes. That matches leading/trailing whitespace allowed. What about `1h\t30m`? "separated by one or more spaces" specifically spaces, not tabs, so invalid. Good.

What about multiple leading/trailing spaces? strip removes valid. Fine.
What about "1h 30m" -> after unit consumes spaces, then parse 30m. Good.
What about "1h 30m " -> strip -> "1h 30m". valid.
What about "1h  30m" -> one or more spaces valid.

Potential issue after consuming spaces, if next char space? We consume all. If i reaches n, that would imply trailing spaces not stripped, impossible. But if there are trailing spaces? t = s.strip()` removes, so no. If internal spaces then end? all trailing removed. So if i >= n after consuming spaces and t not stripped? no.

What about input "  " blank: strip empty raise ValueError.

What about "0h" valid total 0.
"00h" valid? non-negative integer, leading zeros allowed? likely yes. int. "01h" valid. No rule against leading zeros. Good.
"1h0m0s" valid.
"1d2h3m4s5" invalid: after s, i at 5, no space, loop number parse digits 5 then no unit end -> invalid. Good.
"1d2h3m4s " strip -> valid.
"1h30m45" invalid.

Need consider "number without unit" e.g. "12" -> parse number, i=end, missing unit -> raise. Good.
"missing number" e.g. "h" -> digits start=end, invalid. "1h m" after 1h consume spaces, next m: digit parse none -> invalid.
"unknown unit" "1x" digits then next char not hms -> invalid. "1hh" -> after first h, i at h next, no space, loop digits none? Actually next char h not digit, start==i -> raise. Good. "1h2x" invalid at unit x.
"uppercase" invalid.
"decimals" "1.5h": parse 1 then next char '.' not unit -> invalid. Good.
"signs" "-1h": first char '-' no digit -> invalid. "+1h" invalid.
"other separators" "1h-2m": after 1h, next '-' not space, loop digit parse none -> invalid. "1h,2m" invalid. "1h_2m" invalid. "1h/2m" invalid.
"1 h" invalid.

Need maybe use regex or simple loop. Code only.

Need produce final single code block. But let's think if any ambiguous about spaces: Rule "Parts may be written together ("1h30m") or separated by one or more spaces ("1h 30m")." Means if separated, spaces "between parts"; not necessarily after each part? Our parser allows e.g. "1h 30m 45s"; good. It also allows "1h  30m". It disallows spaces between number and unit.

What about "1h30m" with a space before first part and after last: strip. Good.
What about interior sequence with no space between some, spaces between other: "1d 2h3m 4s" our parser:
- 1d, consume space, parse 2h, no space, parse 3m, consume space, parse4s. Valid. Is that allowed? "Parts may be written together ... or separated by spaces" It should allow mixture. Yes.

Need function only. Could include helper mapping inside. Use `int(num_str)`. However if num_str very long, int can parse. No concern.

Edge cases: Python `str.strip()` with no args strips whitespace; if input starts with non-breaking space, strips as leading whitespace? Python considers \xa0 whitespace. Is that allowed? "leading/trailing whitespace" maybe okay. If not, but not major. "other separators" invalid: if non-breaking is interior, invalid. Leading/trailing NBSP stripped. If desire only ASCII spaces, could use `s.strip()` still. Fine.

Need maybe check type: If s is None, `.strip` AttributeError. Problem expects str. Could raise ValueError? "Anything else raises ValueError" might include non-string? no. But to be safe, if not isinstance(s, str): raise ValueError. We can add. But signature says s: str. It doesn't hurt? If tests pass non-str maybe they expect ValueError? Could. But standard. Add:
```
if not isinstance(s, str):
    raise ValueError("duration must be a string")
```
But if s is subclass? fine.

Now code:
```
def parse_duration(s: str) -> int:
    if not isinstance(s, str):
        raise ValueError("duration must be a string")
    t = s.strip()
    if not t:
        raise ValueError("empty duration")
    seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    order = {'d':0,'h':1,'m':2,'s':3}
    total = 0
    last_rank = -1
    i = 0
    n = len(t)
    while i < n:
        start = i
        while i < n and '0' <= t[i] <= '9':
            i += 1
        if start == i:
            raise ValueError("missing number")
        num_str = t[start:i]
        if i >= n or t[i] not in seconds:
            raise ValueError("missing or invalid unit")
        unit = t[i]
        i += 1
        rank = order[unit]
        if rank <= last_rank:
            raise ValueError("units out of order or repeated")
        total += int(num_str) * seconds[unit]
        last_rank = rank
        if i < n:
            if t[i] == ' ':
                while i < n and t[i] == ' ':
                    i += 1
                if i >= n:
                    raise ValueError("unexpected trailing spaces") # but strip should make impossible
            else:
                # no space: next must be part, loop will validate; could a digit start.
                # But if next char is not digit, loop start==i raises. Fine.
                pass
    return total
```
Wait possible bug: after parsing unit, if i<n and t[i] != ' ', we don't check if next is digit. Loop will parse number. If next is invalid char, e.g. "1hx", i at x; next loop start=i, digit while no, start==i => raise. Good.
If "1h 30m  " t strips. Good.
If "1h " t="1h" no trailing. Good.

Potential issue with "1h 30m" after consuming spaces, loop parses 30m. Good.

What about "1h30m" after parse 1h, i at '3', no space, loop parse 30m. Good.

Now order check: `rank <= last_rank`. For first part last=-1, okay. For "1h1m" rank1 then2 valid. For "1h1s" 1 then3 valid. For "1m1s" valid. For "1d1s" valid. For "1h1d" rank1 then0 <=1 invalid. For "1h1h" equal invalid. For "1d1h1m1s" good.

Should we enforce unit each at most once separately? Strict increasing ranks also implies no repeat. Good.

What about "1d2d" invalid at second rank 0 <= last 0. Good.

Potential issue: The `strip()` removes leading/trailing whitespace, but if there are internal newlines, e.g. "1h\n30m": after 1h, t[i]='\n' not space, loop start at newline no digit => raise. If rule considers whitespace as spaces, maybe should allow newline? It says spaces. Leading/trailing whitespace only. Good.

What about "1h  30m" one or more spaces. Good.
What about "1h 30m\t" after strip becomes "1h 30m", valid. Leading/trailing whitespace allowed. Good.
What about "1h\t30m" invalid. Good.

Could there be zero spaces between parts but unit order e.g. "1h30m". Good.

Now maybe "Parts may be written together or separated by one or more spaces" means no spaces within part, but could have spaces around? Leading/trailing allowed. Our parser after strip ignores leading/trailing.

Need no printing/input. Single code block.

However let's re-evaluate need raise ValueError for "unknown unit". Our code if unit not in seconds. Good.

Potential edge: "1h 30" -> after spaces parse 30 then i=end, error missing unit. Good.
"1h 30 " strip "1h 30" -> error missing unit. Good.
"1h  " strip "1h" valid. Leading/trailing whitespace allowed. Good.

Potential edge: "1h 0" -> missing unit invalid.
"1h 0m" valid, total 3600.
"0d0h0m0s" valid total 0.
"0" invalid.

Should we handle empty or blank string: t empty. Good.

What about a string with only spaces and tabs: strip empty. Good.

Now final output code block. Need only code. Fine.

Need maybe provide comments? Desired code. Could include docstring. No tests. Single code block.

Let's produce.