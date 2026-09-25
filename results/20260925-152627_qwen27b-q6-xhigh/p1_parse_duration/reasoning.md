We need answer with code only in python block. Need produce complete solution parse_duration. Need think through regex. User asks: Write function parse_duration(s: str) -> int converts duration string to total seconds. Rules: part is non-negative integer + unit no space. Units d,h,m,s lowercase. Order d,h,m,s each at most once, subset allowed. Parts may be together or separated by one or more spaces. Leading/trailing whitespace allowed. No normalization, 90m valid. Anything else raises ValueError: empty/blank, unknown unit, wrong order, repeated unit, missing number, number without unit, decimals, signs, uppercase units, other separators.

Need Python 3.11+ standard library only. Single code block. No tests. No input/print.

Need design robust. Could use regex fullmatch. Need allow leading/trailing whitespace, parts separated by spaces? "separated by one or more spaces" only spaces, not tabs? Other separators raise ValueError. Leading/trailing whitespace allowed: whitespace maybe any? They say leading/trailing whitespace. But parts separated by one or more spaces. "other separators" invalid. If using re.fullmatch(r'\s*((\d+[dhms])(\s+\d+[dhms])*)\s*') could allow tabs between parts, but separators should only spaces. Leading/trailing whitespace maybe allow any whitespace? Usually whitespace could include spaces, tabs. Need be precise: parts may be separated by one or more spaces. Other separators invalid. Leading/trailing whitespace allowed. I can allow only spaces around? "whitespace" often means spaces? Could use [ \t\n]? But other separators includes tabs? If tabs are whitespace maybe allowed. But "one or more spaces" explicitly spaces. Safer: allow leading/trailing \s*, but between parts use + (one or more spaces). However if leading/trailing has tabs, allowed as whitespace? Maybe. But if internal tab, invalid because not spaces. Could use pattern:
^\s*(?:(\d+)([dhms]))((?:\s+\d+[dhms])*)\s*$? But \s+ between would allow tabs. Use [ ]+? "spaces". Maybe ASCII spaces. Let's use r'[ ]+' between parts. Leading/trailing r'\s*'. But if input contains non-breaking? no.

Need enforce order and no repeats. Regex alone can enforce order with optional groups:
^\s*(\d+d)?(\s+)?... messy. Simpler: match sequence of parts with allowed separators, then validate units order. Or full regex with optional groups:
pattern = r'\s*(?:(\d+)d\s+)?(?:(\d+)h\s+)?(?:(\d+)m\s+)?(?:(\d+)s)?\s*' but parts may be together, no spaces between. Need allow spaces between any parts. Optional group with unit. If there is a part followed by optional spaces before next part, but no trailing space before next? Pattern:
^\s*(?:(\d+)d[ ]+)?(?:(\d+)h[ ]+)?(?:(\d+)m[ ]+)?(?:(\d+)s)?\s*$
But this requires space after d if followed by h, but if no following, optional trailing whitespace handles? For "1d 2h": d group captures 1d[ ]+ consumes space, h group. For "1d2h": d group cannot consume [ ]+ (not present) but it is optional? If written as (?:...[ ]+)? as whole, then in "1d2h" it would skip d group because [ ]+ fails, then h group must start at '1d2h' fails. Need separate optional trailing space: (?:(\d+)d[ ]+)? makes space part of group. Instead use (?:\s*(\d+d)?)? Not good.

Could parse by splitting on spaces and matching each part. Leading/trailing whitespace: strip. If blank -> ValueError. Split on ' '+? But if multiple spaces, use re.split(r' +', s.strip()). If any empty? If tabs? If s contains tab internal, strip might not remove internal, split on spaces leaves token with tab, part regex fails -> ValueError. Good. But leading/trailing whitespace allowed maybe tabs: s.strip() removes all whitespace. If internal tabs invalid. Good.

Then for each token must match ^\d+[dhms]$. Then units list. Check order: expected sequence d,h,m,s. We can iterate units, ensure each > previous order and not repeated. Since each token unit one. But what about token "0001h" non-negative integer leading zeros? Non-negative integer probably allows leading zeros? Not specified. It says non-negative integer. Usually leading zeros accepted? Could be considered integer. But if strict? Missing number etc. No mention leading zeros invalid. Allow. But huge int? Python int fine. But duration could exceed? no issue.

But if token has multiple digits plus unit. Could there be number without unit? token "12" fails. Decimal "1.2h" fails. Sign "+1h" fails. Unknown unit fails. Uppercase fails.

Need order and repeated. Using unit_index = {'d':0,'h':1,'m':2,'s':3}. last=-1. For each part unit, if idx <= last: ValueError. Then sum int(number)*seconds[unit].

Need consider "Parts may be written together ("1h30m") or separated by one or more spaces ("1h 30m"). Leading/trailing whitespace is allowed." If we split on one or more spaces after strip, "1h 30m" okay. What about "1h    30m" okay. What about "1h\t30m" invalid due token "h\t30m"? Let's simulate: s.strip() -> '1h\t30m' (tab not stripped internal), re.split(r' +') -> ['1h\t30m']; fails. Good. If leading tab: strip removes. Good.

But what about string "1h  30m " strip -> split ' +': ['1h','30m']. okay. What about " 1h30m " okay.

Potential issue: If string is "1h 30m " and there are multiple spaces. re.split(r' +') fine. If only spaces, no empty tokens. If string has only spaces strip -> '', ValueError. If string has no spaces but token "1h30m" okay.

Could also use full regex to ensure only parts and spaces. But split approach robust. Need ensure separators are spaces not any whitespace. Using re.split(r' +', stripped) splits on spaces. If stripped contains tabs, token invalid. If stripped contains newline internal, invalid. Leading/trailing whitespace allowed: strip removes all whitespace; maybe if they only wanted spaces, tabs at ends maybe should invalid? It says whitespace, okay.

Could there be a part separated by zero spaces (together) and also spaces elsewhere? Yes.

Need code concise. Should we compile regex? okay.

Function:
import re

_PART_RE = re.compile(r'\A(\d+)([dhms])\Z')
_UNIT_SECONDS = {'d':86400,...}
_UNIT_ORDER = {'d':0,...}

def parse_duration(s: str) -> int:
    if not isinstance(s, str): maybe type error? signature str. Could raise ValueError? not necessary.
    stripped = s.strip()
    if not stripped: raise ValueError(...)
    tokens = re.split(r' +', stripped)
    total=0; last=-1
    for token in tokens:
        m = _PART_RE.fullmatch(token) # using fullmatch
        if not m: raise ValueError(...)
        number = int(m.group(1)); unit=m.group(2)
        order = _UNIT_ORDER[unit]
        if order <= last: raise ValueError(...)
        last=order
        total += number*_UNIT_SECONDS[unit]
    return total

Potential issue: re.split(r' +', stripped) if stripped contains leading/trailing spaces? stripped no. If stripped contains spaces multiple. Good. But if stripped is "1h  30m" okay. If stripped is "1h   30m" okay. If there are spaces between number and unit? token "1 h" -> split into '1','h', both fail. Good.

Need ensure "1h  2h" repeated h -> order <= last, ValueError.

What about "1d2h3m4s" okay. "1d 2h 3m 4s" okay. "1d 2h 3m 4s " okay. "1d  2h 3m 4s" okay.

What about "1d 2h 3m 4s  " okay.

What about "0d1h2m3s" valid? non-negative integer includes zero. yes.

What about very large? okay.

Need maybe consider Unicode digits? \d in Python re matches Unicode decimal digits by default. Is that okay? "non-negative integer" maybe ASCII digits. To be strict, use [0-9]+. Better use ASCII to reject non-ASCII digits (e.g., '١h') as unknown? ValueError. Use pattern r'\A([0-9]+)([dhms])\Z'. Also re.ASCII not needed.

Need consider int('') no.

Could use str.split() but that splits on any whitespace and removes internal tabs, violating "other separators". So use spaces.

Need maybe allow multiple spaces only, but what about carriage return in Windows string? If "1h\r\n30m", strip? internal \r\n remains, token invalid. Leading/trailing \r\n removed if at ends. okay.

Should we use str.isspace? no.

Potential issue: stripped = s.strip() removes all Unicode whitespace, including no-break? maybe okay. But if they only want spaces, leading tab maybe invalid? But they say whitespace allowed, okay.

Need final answer only code block. No explanation.

Double-check requirements: "Anything else raises ValueError: empty or blank string, unknown unit, wrong order, repeated unit, missing number, number without unit, decimals, signs, uppercase units, other separators." If use strip, blank with tabs is empty -> ValueError. Good. If internal other separators like comma -> token fails. If part "1d 2h " okay. If "1d 2h" okay. If "1d  2h" okay. If "1d 2h3m" okay.

Could there be spaces between unit and next number? yes allowed. Could there be spaces before a part in middle? yes.

Alternative regex fullmatch might be more direct:
pattern = r'\s*(?:(\d+[dhms])(?:\s+\d+[dhms])*)\s*' then validate. But our split works.

Need ensure if s is not str, maybe attribute error. Not needed. But if user passes None, .strip raises AttributeError not ValueError. Signature says str. Could guard to raise ValueError? Usually not. But to be safe? If not isinstance(s, str): raise ValueError. But type hint. It may be okay. However problem likely tests only strings. Adding guard doesn't hurt except if tests expect TypeError for non-str? Usually not. But "Anything else" means invalid duration strings, not non-str. Could leave.

Need maybe compile split regex. _SPLIT_RE = re.compile(r' +').

Let's consider edge cases:
- parse_duration('1d2h') -> tokens ['1d2h']? Wait, if parts written together, "1d2h" is a single token, not two parts separated by space. Our part regex ^[0-9]+[dhms]$ fails on '1d2h' because it has extra chars. Ah! Major mistake. The rule: parts may be written together ("1h30m"). That means the entire string can have concatenated parts. If we split on spaces, "1h30m" is one token containing multiple parts. Part regex per token fails. Need parse concatenated sequence of parts. Need adjust.

We need parse string as sequence of parts, where parts can be adjacent or separated by spaces. Approach: remove spaces? If we simply s = s.strip().replace(' ', '')? But then other separators? If internal tabs, replace spaces only leaves tabs causing invalid. But if we strip, then remove all spaces, then match sequence of parts. However if there are multiple spaces, removed. If other whitespace internal remains and invalid. Leading/trailing whitespace removed. But careful: if there are spaces between number and unit "1 h30m", remove spaces -> "1h30m" would become valid incorrectly. But rule says no space between number and unit. If we remove all spaces, we mask spaces between number and unit. Need ensure spaces only occur between parts, not inside a part. If we remove all spaces after stripping, "1 h30m" becomes "1h30m" valid, but should invalid because space between number and unit. So cannot just remove all spaces. Need parse with regex that allows spaces only between complete parts. Could use regex to find sequence: parts are \d+[dhms], optionally followed by spaces and next part. Spaces may be between parts, but not between number and unit because part regex consumes number+unit. If using full pattern: ^\s*(\d+[dhms])([ ]+\d+[dhms])*?\s*$? Need allow spaces between parts, but not within. For "1 h30m", pattern: start ^\s*, then (\d+[dhms]) tries to match "1 h30m"? It requires digit+unit contiguous. At '1' next char is space, fails. Could it match nothing? no. So invalid. Good.

Need fullmatch pattern with optional spaces between parts:
r'\A\s*((?:\d+[dhms])(?:[ ]+\d+[dhms])*)\s*\Z'
Then extract all parts using findall or regex with groups. But need enforce order and no repeats. Could after fullmatch, find parts with r'\d+[dhms]' (will find all). For "1h30m" finds ['1h','30m']. For "1h 30m" finds ['1h','30m']. Need ensure no spaces inside part, already fullmatch ensures spaces only between complete parts? Let's test: "1 h30m": fullmatch? \s* start, then first part \d+[dhms]. At position after leading whitespace (0) sees '1', then needs unit but sees ' ', fail. Could it start later? fullmatch anchored, no. invalid. Good. "1h 3 0m": first part 1h, then [ ]+\d+[dhms] expects space then number unit. After space sees '3', then unit? next '0'? fail. invalid. "1h 30m" valid.

But pattern (?:[ ]+\d+[dhms])* only allows one part after spaces, but repeated. Good. Need ensure no spaces at end? \s* allows.

However pattern with \s* leading/trailing allows tabs at ends. Good. Internal separator [ ]+ only spaces. If there are tabs between parts, invalid. If there are newline between parts, invalid. Good.

Then extract parts. But if fullmatch succeeds, there are no invalid chars. We can use re.findall(r'[0-9]+[dhms]', s) maybe on stripped? But if s contains Unicode digits? fullmatch uses \d maybe Unicode. Use [0-9] for strict. Pattern: r'\A\s*((?:[0-9]+[dhms])(?:[ ]+[0-9]+[dhms])*)\s*\Z'. Then findall with same part pattern. But if there are leading/trailing whitespace, findall works. Could also use finditer on stripped? If we use fullmatch, we can just find parts in stripped (spaces only between). But if spaces between number and unit, fullmatch fails. Good.

Need then validate units order.

Potential problem: fullmatch pattern only allows spaces between parts, but also allows zero spaces (concatenated). Yes because the group for separator is optional? Actually (?:[ ]+[0-9]+[dhms])* means after first part, each subsequent part must be preceded by one or more spaces. It does not allow a subsequent part with zero spaces! Wait pattern: first part, then (?: [ ]+ part )* only. It requires spaces before each additional part. It does NOT allow concatenated "1h30m" because after first part "1h", the next part "30m" has no spaces, so the separator group won't match, but the star can end, then \s* and end? It would expect end after "1h", but there's "30m" left, fullmatch fails. Need allow zero or more spaces between parts: (?:[ ]* part)*? But that would allow spaces inside? Let's see: first part, then [ ]* part repeatedly. For "1h30m", after 1h, [ ]* matches zero, part 30m matches. For "1h 30m", [ ]* matches spaces. For "1 h30m": first part cannot match '1 ' (needs unit contiguous), fail. Good. For "1h 30m" okay. But [ ]* also allows any number spaces, including zero. Need avoid matching empty? part nonempty. Pattern: r'\A\s*((?:[0-9]+[dhms])[ ]*(?:[0-9]+[dhms])*)?\s*\Z'? Simpler: r'\A\s*((?:[0-9]+[dhms][ ]*)+)?\s*\Z' But this allows trailing spaces between? Let's test: "1h  " -> part 1h then [ ]* consumes trailing spaces, plus outer \s*. valid. " 1h" valid. "1h  30m" valid. "1h30m" valid. "1 h30m": first part? [0-9]+[dhms] cannot match '1 ' so fail. Good. But pattern ((?:[0-9]+[dhms][ ]*)+)? may allow string of just spaces? Outer \s* covers, empty group optional -> would fullmatch whitespace string, but we explicitly blank check after strip. If we don't blank check, need group required. Use stripped = s.strip(); if not stripped: ValueError. Then pattern on stripped? If stripped no leading/trailing whitespace. Need allow spaces between parts. Could use r'\A(?:[0-9]+[dhms][ ]*)+\Z' on stripped. But this would allow trailing spaces? stripped none. It would allow spaces after a part before end? If stripped has trailing spaces none. But if internal "1h  " stripped -> '1h'. okay. If "1h 30m " stripped -> '1h 30m'. pattern: part 1h [ ]* matches spaces, part 30m [ ]* zero, end. valid. If "1h 30m " ok. If "1h 30m 45s" valid. If "1h 30m  " stripped. Good.

But pattern r'(?:[0-9]+[dhms][ ]*)+' on stripped allows spaces after last part? stripped no trailing, but if there are spaces between last part and end? none. However if stripped has spaces at end? strip removed. Good. It also allows multiple parts with no spaces or spaces. It does not allow leading spaces because stripped no. It does not allow spaces before first part. Good.

Need ensure it doesn't allow spaces between number and unit: part [0-9]+[dhms] contiguous, [ ]* only after unit. Good.

Then find all parts: re.findall(r'[0-9]+[dhms]', stripped) (or with pattern). Since stripped has spaces only after units, findall finds parts. For "1h 30m", ['1h','30m']. For "1h30m", ['1h','30m']. For invalid "1 h30m" full pattern fail before findall.

But careful: pattern r'(?:[0-9]+[dhms][ ]*)+' on stripped will accept "1h 2h " if stripped? trailing space removed, no. Accept "1h 2h" repeated unit caught later.

Need fullmatch? Use _DURATION_RE.fullmatch(stripped) with _DURATION_RE = re.compile(r'(?:[0-9]+[dhms][ ]*)+') . But this pattern could match "1h  " if stripped not? no. If s.strip() removes trailing spaces, okay. But if s contains internal tabs after unit, e.g., "1h\t30m": stripped same. Pattern: [0-9]+[dhms] matches 1h, [ ]* matches zero (tab not space), plus end? there is tab left, fail. invalid. Good.

What about "1h\n30m": invalid. Good.

What about "1h " (trailing space) stripped '1h', valid. Good.

What about "  1h 30m  " stripped '1h 30m', valid.

What about "1h  30m" valid.

What about "1h  30m 45s" valid.

What about "1h 30m 45s " valid.

What about "1h 30m 45s\t" stripped removes trailing tab? str.strip removes tab, so valid if only trailing tab. Leading/trailing whitespace allowed. okay.

Need maybe not use strip() because it removes all whitespace, including internal? It only removes ends. Good.

Now part extraction: Could use finditer on stripped with r'([0-9]+)([dhms])'. Since full pattern ensures valid, but findall with r'[0-9]+[dhms]' will correctly split concatenated. For "1h30m" -> ['1h','30m'].

Potential issue: If a token is huge and findall uses regex, okay.

Alternative parse by regex capturing all parts in one pass:
m = re.fullmatch(r'((?:[0-9]+[dhms][ ]*)+)', stripped)
parts = re.findall(r'([0-9]+)([dhms])', stripped)

Then validate.

Need ensure fullmatch not match empty. We blank check.

Let's test manually:
- '1d4s': stripped, pattern: part 1d [ ]* zero, part 4s, end. findall [('1','d'),('4','s')]. order 0 then 3. total 86404.
- '1h 30m': pattern part 1h [ ]* consumes ' ', part 30m. good.
- '1h30m': part 1h zero, part 30m. good.
- '1h  30m': [ ]* consumes both. good.
- '90m': valid.
- '': blank ValueError.
- '   ': blank.
- '1': pattern fail (no unit). ValueError.
- 'h': fail (no number).
- '1x': fail.
- '1d2h3m4s': good.
- '1s2d': pattern good, findall order 3 then 0 -> order <= last -> ValueError.
- '1d1d': order repeat -> ValueError.
- '1.2h': pattern? [0-9]+ matches '1', then expects unit but '.' fails. Could [0-9]+ start at '2'? anchored fullmatch no. fail.
- '+1h': fail.
- '1H': fail.
- '1h 30M': pattern? first 1h, [ ]* space, then [0-9]+[dhms] at '30M' fails (M uppercase). fullmatch fail.
- '1h,30m': pattern part 1h [ ]* zero, expects part or end, comma fail.
- '1 h30m': pattern first part at start: [0-9]+ matches 1, expects unit but space fail. Could [0-9]+ match empty? no. fail.
- '1h 3 0m': pattern: 1h, space, part [0-9]+ at 3 expects unit but 0 fail. fail.
- '1h 30m 45s 60d': pattern valid syntax, order 1,2,3,0 -> last 0 <=3 -> ValueError.
- '1d 2h 3m 4s 5s': syntax valid, repeat s -> ValueError.
- '00d01h02m03s': valid? int leading zeros. yes.
- '1d2h 3m4s': valid.

Need maybe pattern with [ ]* after each part allows spaces after a part but not before next? It consumes spaces, then next part. If there are spaces between parts, okay. If there are multiple spaces, okay. If there are spaces after last part but stripped removed; if we didn't strip, [ ]* would consume trailing spaces too. But strip okay.

However, using strip() and pattern (?:[0-9]+[dhms][ ]*)+ on stripped means if string has internal space sequence after a part and then end? stripped would have no trailing, so not. If string is "1h  30m" okay. If string is "1h  30m  " strip removes trailing, okay. If string is "1h  30m  45s" okay.

Could pattern accidentally allow a space after a part and then no next part, if stripped somehow contains trailing spaces? no. But if we didn't blank? not.

Could use _DURATION_RE.fullmatch(s.strip()) where regex includes optional trailing spaces: r'(?:[0-9]+[dhms][ ]*)+' would allow trailing spaces in stripped? no. okay.

Need think about "separated by one or more spaces" maybe they intend spaces between parts are optional (together) or one or more. Our [ ]* allows zero or more, which covers both. But if parts are separated by spaces, one or more; zero means together. Good.

What about spaces between concatenated part boundary? e.g., "1h 30m" vs "1h30m". Good.

Could there be a space between a unit and the next number when the next part is lowercase? yes.

Need maybe ensure "other separators" includes multiple spaces? It says separated by one or more spaces, so multiple spaces allowed. Good.

Could there be tabs as leading/trailing whitespace? str.strip removes. If they want only spaces, maybe tests may include ' \t1h'? Leading whitespace allowed, maybe okay. If they consider tab other separator, but at leading it's whitespace. Fine.

Need maybe no normalization means don't convert 90m to 1h30m, but sum seconds okay.

Now, code. Need only function? Could include import re. Complete solution. Single python block. No tests.

Potential issue with regex and Python's re: [ ] is ASCII space. Good. \s in strip? strip no args removes whitespace (Unicode). Could maybe use s.strip(' ') to only spaces? But "leading/trailing whitespace" allowed. Keep strip(). If internal vertical tab? invalid.

Could define _PART_RE = re.compile(r'([0-9]+)([dhms])') and _DURATION_RE = re.compile(r'(?:[0-9]+[dhms][ ]*)+') . In function:
    t = s.strip()
    if not t or not _DURATION_RE.fullmatch(t): raise ValueError(...)
    total = 0
    last = -1
    for num_s, unit in _PART_RE.findall(t):
        order = _UNIT_ORDER[unit]
        if order <= last: raise ValueError(...)
        last = order
        total += int(num_s) * _UNIT_SECONDS[unit]
    return total

Need _PART_RE.findall returns list of tuples. It will find numbers and units. Since duration regex already validated, no invalid. But if duration regex uses [ ]* after part, it could match "1h  30m"; findall returns correct. It won't find overlapping. Good.

But subtle: _DURATION_RE pattern (?:[0-9]+[dhms][ ]*)+ on t can match "1h  30m" but also "1h  30m  " if t not stripped. t stripped. Good.

What about a string with a null character? pattern fail. ValueError.

What about very long string of parts? int okay.

Could optimize by iterating regex finditer instead of findall. Fine.

Need consider if s is a bytes object? not.

Maybe tests expect parse_duration('1d 2h 3m 4s') == 90004? 86400+7200+180+4=938? Wait 86400+7200=93600, +180=93780, +4=93784. Good.

Let's compute example "1d4s" 86404.

Need maybe unit seconds: d 86400, h 3600, m 60, s 1.

Should we include docstring? okay but not necessary. Code only. Could include private constants.

Let's think if any invalid string could pass _DURATION_RE but should fail due "missing number"? Pattern requires [0-9]+. Good.

"number without unit": fail.

"decimals": fail.

"signs": fail.

"uppercase units": fail.

"unknown unit": fail.

"wrong order": caught.

"repeated unit": caught.

"empty or blank": blank check.

"other separators": internal tabs/newlines/comma fail. But what about a space at beginning after strip? removed. A space at end removed. A tab at beginning removed (whitespace). If they consider tab other separator only internal. okay.

One nuance: _DURATION_RE = (?:[0-9]+[dhms][ ]*)+ allows a sequence like "1h  30m" and also "1h  30m " if not stripped. But if we use t=s.strip(), trailing whitespace removed. However strip removes all whitespace at ends, including tabs. That means string "1h\t" (trailing tab) becomes "1h" and valid. Is trailing tab "whitespace"? yes. okay.

Could strip remove a valid part? no.

Potential issue: Python's str.strip() with no args removes characters with Unicode whitespace property. Some Unicode spaces might be considered whitespace but not space. If leading/trailing allowed, okay. Internal Unicode space (e.g., nbsp) not removed, pattern [ ] only ASCII space, so invalid. Good.

Could use re.fullmatch(_DURATION_RE, t) vs _DURATION_RE.fullmatch(t). Both.

Need maybe raise ValueError with message? Not required. Can raise ValueError("invalid duration") maybe.

Should we include type annotation -> int. yes.

Now, let's think if pattern with [ ]* after each part might allow spaces between parts but not enforce that if there are spaces, they separate parts; yes because next part required after spaces in the + repetition. But if spaces occur after last part in t? t stripped. If t somehow has trailing spaces due to using strip? no. But what about a string with multiple spaces between parts and then a zero-length part? no.

Could _DURATION_RE.fullmatch('1h   ') if t not stripped? [ ]* after 1h consumes spaces, end, valid. But t stripped, so '1h'. If we didn't strip, trailing spaces allowed anyway, okay. But leading spaces not allowed by pattern. Could incorporate \s* around: r'\s*(?:[0-9]+[dhms][ ]*)+\s*' but then internal tabs at ends okay. But if use strip, simpler.

Potential hidden test: parse_duration('1h  30m') okay. parse_duration('1h   30m') okay. parse_duration('1h\t30m') should ValueError. Our t = '1h\t30m', pattern fails. Good.

Hidden test: parse_duration(' 1h30m ') okay. t='1h30m'. Good.

Hidden test: parse_duration('1h 30m ') okay.

Hidden test: parse_duration('1h 30m  45s') okay.

Hidden test: parse_duration('1h 30m 45s 60d') wrong order.

Hidden test: parse_duration('1d 2d 3h') repeated.

Hidden test: parse_duration('1d 2h 3m 4s 5s') repeated.

Hidden test: parse_duration('1d2h3m4s') valid.

Hidden test: parse_duration('2') fail.

Hidden test: parse_duration('d') fail.

Hidden test: parse_duration('1 d') fail.

Hidden test: parse_duration('1 d 2h') fail.

Hidden test: parse_duration('1.0h') fail.

Hidden test: parse_duration('-1h') fail.

Hidden test: parse_duration('1H') fail.

Hidden test: parse_duration('1d 2H') fail.

Now, possible alternative: parse by regex capturing optional groups in order. But our method good.

Need ensure no use of input/print.

Now final should be:
```python
import re

_PART_RE = re.compile(r"([0-9]+)([dhms])")
_DURATION_RE = re.compile(r"(?:[0-9]+[dhms][ ]*)+")
_UNIT_SECONDS = {"d": 86_400, "h": 3_600, "m": 60, "s": 1}
_UNIT_ORDER = {"d": 0, "h": 1, "m": 2, "s": 3}

def parse_duration(s: str) -> int:
    t = s.strip()
    if not t or not _DURATION_RE.fullmatch(t):
        raise ValueError("invalid duration")
    total = 0
    last_order = -1
    for number, unit in _PART_RE.findall(t):
        order = _UNIT_ORDER[unit]
        if order <= last_order:
            raise ValueError("invalid duration")
        last_order = order
        total += int(number) * _UNIT_SECONDS[unit]
    return total
```

Need think: _DURATION_RE allows only spaces after parts. But what about leading/trailing whitespace includes spaces; we strip. Good. But what if t has a space after a part and then another part, okay. However [ ]* can match zero spaces, so concatenated. Good.

One subtle bug: _DURATION_RE pattern (?:[0-9]+[dhms][ ]*)+ can match "1h  30m" but also "1h  30m 45s". Good. But because [ ]* is inside repetition, it will consume spaces after each part. If there is a space after a part and then the next part, fine. If there are spaces between parts, fine. If there are multiple spaces, fine. If there is a space after a part and then no next part but t not stripped? no. If t has internal trailing spaces before a non-whitespace? e.g., "1h  30m  45s" good. If t has "1h  30m  45s " t stripped.

But if t has "1h  30m  45s" with spaces after 30m, the [ ]* after 30m consumes spaces, then 45s. Good.

Could _PART_RE.findall(t) find parts in the spaces? no.

Potential issue with very large integer with leading zeros: int('000') ok.

Could unit order be enforced by regex? no but code.

Could there be a part with number 0 and unit, valid. total unaffected.

Now, should ValueError be raised for non-string? If s is None, t = s.strip() AttributeError. The problem only strings. If want robust:
    if not isinstance(s, str): raise ValueError(...)
But type hints. Adding could be okay. But if tests pass a string subclass? isinstance ok. If tests pass bytes maybe expect ValueError? Not specified. Could include guard to ensure ValueError for anything else? But "Anything else raises ValueError" maybe anything else in input string, not type. Adding guard won't hurt for str. If a test calls parse_duration(b'1h') maybe they might expect TypeError? Usually not. But to be safe with signature, no guard. Or guard to ValueError might be considered okay? If they test type errors, uncertain. I'd not guard.

Need maybe use from __future__? no.

Now, consider if they expect parse_duration('1d 2h 3m 4s') to be int. yes.

Let's think if "Units must appear in the order d, h, m, s. Each unit at most once. Any subset is allowed." This means you can have d then s (skipping h,m), valid. Our order allows increasing indices. Good. You can have m only, valid. You can have s then d invalid. Good.

"No normalization: '90m' is valid (5400)." We don't normalize.

"Parts may be written together ("1h30m") or separated by one or more spaces ("1h 30m"). Leading/trailing whitespace is allowed." We allow both. Good.

"Any part is <non-negative integer><unit> with NO space between number and unit." Our duration regex ensures each part contiguous. But wait: Does _DURATION_RE enforce no space between number and unit for all parts? Yes because part is [0-9]+[dhms] with no optional space in between. However, because it's greedy and spaces can be consumed by previous [ ]*, could there be a case where a space after a number is consumed by previous [ ]* and then next part begins, causing a number without unit to be skipped? Example "1 2h". t='1 2h'. Pattern: first repetition: [0-9]+ could match '1', [dhms] expects ' ' fail. Could [0-9]+ match '1' then no unit fail. Could [0-9]+ match? no. So invalid. Good. Example "1h 2 3m": first 1h, [ ]* consumes space, second part [0-9]+ matches '2', unit expects ' ' fail. Could second [0-9]+ match '2' and then? fail. invalid. Good. Example "1h  2m" valid.

What about "1h 2m" where [ ]* after 1h consumes both spaces? yes.

Could there be a case where [0-9]+ matches fewer digits to allow unit later? e.g., "12h": [0-9]+ greedy matches '12', unit h. Good. If "12h3s": first part '12h', then '3s'. Good. If "12h 3s": good. If "12h 3s" with spaces. Good. If "12h 3s" no issue.

What about "12h 3s" where [0-9]+ after space could match '3', unit s. good.

Now, think about regex fullmatch and backtracking: It might match "1h30m" in a way that first part '1h30m'? No, unit only one char [dhms], so first part [0-9]+[dhms] matches '1h'. It cannot include '30m'. Then [ ]* zero, next part '30m'. good.

Now, possible issue: _DURATION_RE = (?:[0-9]+[dhms][ ]*)+ will also match "1h  30m  45s" but the spaces after last part? if t not stripped. But if t includes trailing spaces, fullmatch can match because [ ]* after last part consumes them. That means we could just fullmatch s (without strip) with leading? It doesn't allow leading. But we strip. okay.

If we strip, t may be empty for blank. Good.

Potential hidden test: parse_duration('1h\u00a030m') where nbsp is whitespace? str.strip might remove if at ends? nbsp is Unicode whitespace? Python str.strip() removes whitespace characters, including nbsp? I think yes if Unicode whitespace. If internal nbsp, pattern [ ] fails, invalid. If leading nbsp, strip removes, maybe valid. Leading whitespace allowed. okay.

Need maybe use [0-9] not \d to avoid Unicode digits. Good.

Could there be a part with unit 's' and next part starts with 's'? e.g., "1s2s" syntax valid but repeated s caught. "1s2d" order invalid. "1d2s" valid.

Now, consider memory/performance. Fine.

Now final answer code block only. Need no explanation. Ensure syntax valid Python 3.11. Numeric underscores okay.

Let's consider if private constants at module level okay. Yes.

Could combine in function to avoid global? fine.

One more nuance: _DURATION_RE.fullmatch(t) where t is stripped. Suppose t = '1h  30m' valid. Suppose t = '1h  30m ' cannot happen. Suppose t = '1h  30m\t' strip removes tab if at end? yes. If tab internal after 30m? '1h 30m\t45s' strip no internal, pattern fails because [ ]* won't consume tab, after 30m expects part or end but tab. invalid. Good.

What about '1h\t30m' invalid. Good.

Could there be multiple spaces between number and unit but stripped? no, internal. invalid.

Now, maybe they want "separated by one or more spaces" meaning if spaces are present, they must separate parts, but also parts may be written together. Our [ ]* allows zero spaces between parts, which is together. It also allows one or more spaces. It does not allow spaces at beginning/end in t because stripped. Good.

Could we accidentally allow a string with a space after a part and then a space, no next part if not stripped. But stripped. If we want be extra strict, use pattern r'(?:[0-9]+[dhms])(?:[ ]+[0-9]+[dhms])*' plus also allow concatenated? Need combine zero or one/more. Our pattern is simpler.

If we wanted no trailing spaces without strip: r'(?:[0-9]+[dhms])(?:[ ]+[0-9]+[dhms])*' doesn't allow concatenated. Could do r'(?:[0-9]+[dhms])(?:[ ]*[0-9]+[dhms])*' with [ ]* zero/more. But this could allow leading spaces? if anchored no. It could allow trailing? no because after last part no [ ]*. If we use this on stripped, okay. Pattern r'(?:[0-9]+[dhms])(?:[ ]*[0-9]+[dhms])*' is maybe more precise: first part, then zero or more groups of optional spaces + part. This allows concatenated and spaces, no trailing spaces (but stripped). For "1h30m", first 1h, second group [ ]* zero + 30m. For "1h 30m", first 1h, second group spaces + 30m. For "1h " if not stripped, would fail after first because end, but stripped. This pattern might be better because it doesn't rely on [ ]* consuming trailing spaces. But both okay. Let's evaluate if r'(?:[0-9]+[dhms])(?:[ ]*[0-9]+[dhms])*' on stripped can accidentally allow spaces after a part that are then treated as before next part? yes intended. It cannot have spaces after last part in stripped. Good. It also cannot have leading spaces. Good.

Which pattern is safer? r'(?:[0-9]+[dhms])(?:[ ]*[0-9]+[dhms])*' requires at least one part. We already blank check. It allows zero spaces between parts. It allows multiple spaces. It fails "1h  30m  " if not stripped, but stripped. It fails "1h  30m" good. It fails "1 h30m" because first part fail. It fails "1h 3 0m" because second group [ ]* consumes space, [0-9]+ matches 3, unit expects 0 fail; could [0-9]+ match '30' and unit m? Wait, for "1h 3 0m": after first 1h, second group [ ]* consumes ' ', [0-9]+ could match '3', unit expects ' ' fail; could match '30'? It sees '3' then space, [0-9]+ is greedy but can backtrack; it cannot include space, so only '3'. fail. Then fullmatch fail. Good.

Could it allow "1h 30m" where [ ]* consumes all spaces, part 30m. good.

Use _DURATION_RE = re.compile(r"(?:[0-9]+[dhms])(?:[ ]*[0-9]+[dhms])*"). This pattern doesn't need blank check? If t empty, fullmatch fails because requires part. But we can still blank check for clearer ValueError. It won't match whitespace. If t='   ', fullmatch fails. But blank check okay.

But note: This pattern allows zero spaces between parts, which means "1h30m" valid. It also allows spaces between parts, but because [ ]* can match zero, it also allows a space after a part to be matched as separator before next. Good.

Potential issue: It allows multiple spaces, but if there are spaces between number and unit? first part cannot match number then space. However, could the first [0-9]+ match the number, unit fail, but the overall regex backtrack to start [0-9]+ at a later digit? Anchored fullmatch prevents starting later. So invalid.

I think this pattern is slightly more explicit. Let's use it.

Full code:
import re

_DURATION_RE = re.compile(r"(?:[0-9]+[dhms])(?:[ ]*[0-9]+[dhms])*")
_PART_RE = re.compile(r"([0-9]+)([dhms])")
_UNIT_SECONDS = {...}
_UNIT_ORDER = {...}

def parse_duration(s: str) -> int:
    t = s.strip()
    if not _DURATION_RE.fullmatch(t):
        raise ValueError("invalid duration")
    total = 0
    last = -1
    for number, unit in _PART_RE.findall(t):
        order = _UNIT_ORDER[unit]
        if order <= last:
            raise ValueError("invalid duration")
        last = order
        total += int(number) * _UNIT_SECONDS[unit]
    return total

Blank string: t='', fullmatch fails -> ValueError. Good. No need explicit blank.

But if t contains only spaces, fullmatch fails. Good.

Check "1h " t='1h', fullmatch valid. trailing space allowed.

Check " 1h" t='1h', valid.

Check "1h\t30m" t='1h\t30m', fullmatch: first part 1h, second group [ ]* matches zero (tab not space), [0-9]+ at tab fails; no more, but end not reached because tab remains, fullmatch fails. Good.

Check "1h 30m" t same, first 1h, second group [ ]* consumes space, 30m, end. Good.

Check "1h30m" first 1h, second [ ]* zero, 30m. Good.

Check "1h  30m" second [ ]* consumes two. Good.

Check "1h  30m  45s" works.

Check "1h  30m  45s " t='1h  30m  45s'. Good.

Check "1h  30m  45s\t" t strips tab? str.strip removes tab, yes. valid if only trailing. Good.

Check "1h  30m  45s\n" valid.

Now, consider if strip removes all whitespace at ends, including spaces, but our regex allows only spaces as separators. If leading whitespace contains tab, allowed. If they wanted only spaces, not sure. But "whitespace" okay.

Could there be a leading space that is not stripped because it's a non-Unicode whitespace? no.

Now, potential hidden test: parse_duration('1h 30m 45s ') expects valid. yes.

Potential hidden test: parse_duration('1h 30m 45s\n') valid. yes.

Potential hidden test: parse_duration('1h 30m 45s\n\t') valid. yes.

Potential hidden test: parse_duration('\n1h 30m\n') valid. yes.

Now, should we use re.ASCII flag for [ ]? not necessary. For [0-9] no.

Could _PART_RE.findall(t) find parts in a way that ignores order? It returns in order. Good.

Now, one more nuance: The duration regex allows concatenated parts without any separator. But the rule says parts may be written together or separated by spaces. Does that mean a string like "1h 30m" has a space between parts, but "1h30m" no. Yes.

What about "1h  30m" multiple spaces, okay.

Now, no normalization: we don't cap m/h. Good.

Need maybe total seconds can be large but int unlimited.

Now, final answer as single code block. Ensure no extra text.

Let's think if there is any possibility that _DURATION_RE.fullmatch(t) accepts a string with a space after a part and then an invalid part but due to backtracking? Example "1h 30x". first 1h, second group [ ]* consumes space, [0-9]+ matches 30, unit expects x fail. No alternative. fullmatch fail. Good.

Example "1h 30mx". first 1h, second 30m, then extra x, fullmatch fail. Good.

Example "1h 30m x". first 1h, second 30m, third group [ ]* consumes space, [0-9]+ at x fail. fullmatch fail. Good.

Example "1h 30m  " t stripped. valid. If we didn't strip, pattern would fail because after 30m, third group could [ ]* consume spaces but then needs part, fail; fullmatch would fail at end? Actually with pattern (?:part)(?:[ ]*part)*, after 30m, remaining spaces. The star can stop, but fullmatch requires end, remaining spaces -> fail. With strip, valid. Good.

Now, maybe they want "Leading/trailing whitespace is allowed" but "other separators" invalid. If trailing tabs are whitespace, allowed. okay.

Could there be a string with a space between parts and also a tab: "1h 30m\t45s" invalid. Good.

Now, if s contains a form feed between parts, invalid. Good.

Now, let's consider if using strip() could hide an invalid leading separator? For example " 1h" leading space allowed. "\t1h" leading tab allowed as whitespace. If they consider tab other separator, but at leading it's whitespace. okay.

Now, one possible strictness: "separated by one or more spaces" means only the space character, not other whitespace, but leading/trailing whitespace allowed. If input is "\t1h", is leading tab whitespace? yes. If they wanted only spaces, maybe invalid. But phrase whitespace suggests allowed.

Now, maybe tests use s = "1h 30m" and s = "1h30m". okay.

Now, final.

Double-check no print, no input.

One more thought: Could use a single regex with named groups to validate order and sum in one? not needed.

Potential issue: _PART_RE.findall(t) on t with spaces will also match number/unit pairs inside e.g. "1h 30m" fine. But if t has something like "1h 30m" no issue. It will not match the spaces. Good.

Now, should constants be inside function to avoid namespace? Either okay. The prompt says write a function. Module-level constants okay. If they execute only function definition, okay.

Could include from typing? no.

Now, ensure code block only. final.
