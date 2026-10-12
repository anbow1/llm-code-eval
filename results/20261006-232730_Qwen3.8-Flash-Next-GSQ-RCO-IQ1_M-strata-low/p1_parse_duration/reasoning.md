We need answer user wants code only single python code block. Need implement parse_duration. Need think thoroughly edge cases. Now produce final code block only.

We need write function parse_duration(s: str) -> int.

Spec:
- A part is <non-negative integer><unit> with NO space between number and unit. Units d,h,m,s mapping. Lowercase only.
- Units must appear order d,h,m,s. Each at most once. Any subset allowed.
- Parts may be written together or separated by one or more spaces. Leading/trailing whitespace allowed.
- No normalization: 90m valid.
- Anything else raises ValueError: empty/blank string, unknown unit, wrong order, repeated unit, missing number, number without unit, decimals, signs, uppercase, other separators.

Need robust parsing using stdlib only. Can regex? Use re standard library okay? Probably yes. But careful with no space between number/unit; separators only spaces between parts. Leading/trailing whitespace allowed. Input can contain tabs? It says separated by one or more spaces; probably space specifically? Could interpret whitespace? It says Leading/trailing whitespace is allowed. "one or more spaces" maybe spaces only. We can allow whitespace? But raising for other separators. To be safe, only space characters as separator? The phrase leading/trailing whitespace could mean any whitespace. But separator says spaces. Usually tests may use spaces. We can use regex with \s for separators? But if they test tabs, maybe they consider whitespace? Hmm. Need decide. Problem explicitly: parts may be written together or separated by one or more spaces. Leading/trailing whitespace allowed. This implies use strip whitespace but internal only spaces. If tab internal maybe other separator -> ValueError. Could use re.fullmatch(r'\s*(...)?\s*')? But internal spaces only? If use \s* separator, tabs accepted, possibly undesired. We can restrict internal separator to spaces: r'\s*(?:...(?: +...)*)?\s*'? But leading/trailing whitespace could include tabs; allowed by spec? If we want to allow leading/trailing any whitespace but internal only space, do: stripped = s.strip(); if not stripped: ValueError. Then use regex fullmatch on stripped with pattern allowing spaces between parts only. But if s contains newline at ends, strip removes. If internal tabs, pattern with space fails. Good.

Regex pattern: (?:0|[1-9]\d*)[dhms] repeated in order with optional spaces between. Need each unit at most once and order. Could parse tokens by splitting on spaces? But parts may be written together e.g. "1h30m" no spaces. Need parse sequentially. Simplest: strip, iterate through string, expecting [number][unit], with optional spaces between parts. Maintain last unit index -1. But need reject if spaces in wrong places? For example "1h  30m" allowed. "1 h30m" should invalid because space between number and unit? We can reject by pattern. Could implement manual scanner.

Approach: s2=s.strip(); if empty raise. i=0; prev=-1; total=0. While i < len: if s2[i]==' ': i++; if i==len or next part? Spaces between parts allowed; after skipping, if i==len, but if initial had only spaces stripped, handled. However if s2 starts no strip? stripped no leading. If internal multiple spaces allowed, okay. But after skipping spaces, if i==len, then trailing spaces? stripped removed trailing. okay. If there is space after complete string? stripped removed. If there is space inside? okay. But if string "1h " stripped -> "1h". Good.

Then need parse a part: at position, must be digit. If not digit, raise. Read digits greedily. Must have non-negative integer, no leading zeros? Spec says non-negative integer. It doesn't explicitly disallow leading zeros. It says anything else raises for decimals, signs, etc. Leading zeros likely okay? "01h" is integer. Could allow leading zeros. But "non-negative integer" standard could allow 0 and leading zeros? Usually regex can allow \d+. But if allow 000 okay. Tests might expect ValueError for 01h? Not specified. We probably allow? Need be cautious. "anything else raises" includes malformed. Leading zeros maybe not disallowed. But if they want canonical? "non-negative integer" might allow. I'll allow \d+; number zero allowed. Need reject number without unit: after digits, require unit.

After digits, if i>=len raise ValueError. unit = s2[i]. Must be one of dhms lowercase. map order. if order index <= prev => wrong order/repeated. If unit unknown raise. Then prev=index, total += value * seconds. i += 1. After part, loop. If there are spaces between parts, skip. But what if spaces before a part at beginning after stripping? none. If internal spaces are used, we skip after previous part at top of loop. But what if no space between parts? works. What if there's a space immediately after unit then next part, skip. What if there are spaces after digits before unit? Our top skip occurs only between parts, not inside part, because after reading digits we immediately require unit, if digit followed by space then unit -> raise. Good. What if space after unit at end? stripped removes. What if input "1h  " -> strip removes -> accepted. Good.

Need reject unknown chars e.g. comma. In loop after skipping spaces, if i>=len break? Actually loop condition while i < len. If i reaches len after skip trailing (shouldn't if stripped). If string "1h  30m" after 1h i at space, loop top skip spaces. Good. If there are consecutive spaces, okay. If there is space before a unit? "1h  d" after skipping, first char 'd' not digit -> raise. Good.

Potential issue: if s2 = "1h 30m " strip removes trailing. If there are leading spaces, strip removes. If internal leading after strip? okay.

What about string with only spaces and tabs? strip removes tabs and spaces; if empty raise. If s=" 1h\t" strip -> "1h" accepted because trailing whitespace allowed. If internal tab between parts? s.strip() -> "1h\t30m", loop sees char tab, not digit, after digits? At after 1h i points to tab, top if s2[i]==' ' only space skip, tab not digit -> raise. Good.

Could use regex for concise. But manual scanner clearer. Need ensure "0" no unit raises. digits parsed, then i len raise. Good.

Need consider very large ints? Python int arbitrary.

Let's test mentally:
"" strip empty raise.
" " strip empty raise.
"1h30m": accepted total 5400.
"1h 30m": after 1h i=2? Actually s2="1h 30m", i after h index2? char space top skip -> index3 char3 digit. accepted.
"1h  30m" accepted.
"1 h30m": after digits '1', i points to space, require unit, space not unit raise. Good.
"1h d": after 1h space skip, char d not digit raise.
"dh": digit? first char d not digit raise.
"1H": unknown unit raise.
"1h1m": accepted if order h m. "1m1h" after m prev=2 then h index1 <= prev raise.
"1h1h": index 1 <= prev raise.
"1d2d": repeated raise.
"1d4s": d index0, s index3 accepted.
"1s4d": s then d order raise.
"1d1h1m1s": accepted all once.
"90m": accepted.
"0s": accepted total0? Should it raise? "anything else raises: empty or blank, ..." 0s is valid part non-negative. Should return 0.
"0": no unit raise.
"00h": allowed.
"1h30m " strip accept.
"\t1h30m\n" strip accept. If internal tabs raise. Good.

Need maybe use string.find? Could use mapping dict. But final answer only code block. No imports needed.

Potential ambiguity: "A part is <non-negative integer><unit> with NO space between number and unit." Does "number" include 0? yes. Does it disallow multiple digits starting with 0? likely not. Could require canonical decimal with no leading zeros except 0? If tests might have "01h" expecting invalid? Spec doesn't say. Most duration parsing accepts 01. But to be safe? The line "anything else raises: ... decimals, signs". Leading zeros are not other things. I'd allow.

Potential issue with spaces: The manual scanner allows spaces between parts but also allows spaces immediately before first part if strip not? We strip. If string contains only non-space whitespace internal? raise.

But if s contains newline at end, strip removes. Good.

Could there be multiple spaces between digits and unit? raise. Good.

Let's think if there is a hidden case: "1h30m 45s" -> accepted. "1h30m45s" accepted order h m s. Good.

Need reject "1d1h0m0s" accepted. total may be zero from zero parts. Valid duration zero if contains units with zero? Yes. Could be weird: "0d0h0m0s" valid returns 0. Not disallowed. "1h0m" valid.

Potential issue: if there is empty string after strip: raise. Good.

Could a part be separated by spaces but with space before first part? strip handles. Good.

Need maybe define unit values with dict. Use ord? Simpler dict.

Could use `unit_order = {'d':0,'h':1,'m':2,'s':3}`.

Manual scanner code:

def parse_duration(s: str) -> int:
    text = s.strip()
    if not text:
        raise ValueError("...")
    unit_order = {'d': 0, 'h':1, 'm':2, 's':3}
    factor = {'d':86400,...}
    total=0; prev=-1; i=0; n=len(text)
    while i < n:
        if text[i] == ' ':
            i += 1
            # Need ensure after skipping spaces there is a valid next part. If after skipping i==n? Since text stripped trailing spaces no, but if there are multiple trailing? stripped removes. If internal all spaces at end impossible. If string "1h   " stripped no trailing. If "1h   30m   " stripped no trailing. If "1h   " stripped no. If "   1h" stripped no.
            continue
        if i >= n:
            break # Actually loop condition prevents. If skip spaces to end due to weird not stripped? no.
        if not text[i].isdigit(): raise ValueError
        num=0
        while i<n and text[i].isdigit(): num = num*10 + ...; i += 1
        if i == n: raise ValueError
        u = text[i]
        if u not in unit_order: raise ValueError
        idx=unit_order[u]
        if idx <= prev: raise ValueError
        prev=idx; total += num * factor[u]; i += 1
    return total

Is there any issue after skipping spaces at beginning? `if text[i]==' ':` continue. But if after skipping there is no valid part, e.g. text not stripped? But we strip. If internal spaces sequence before end? stripped end removes. Could string contain `1h ` and strip -> no. `1h	 ` with strip? Python strip removes tabs too, but if internal tab not removed. Good. But if text = '1h  ' strip -> '1h'. Good. If text contains form feed? strip removes. fine.

One subtlety: If after skipping spaces we `continue`, but loop condition i < n; if i becomes n due to a trailing space not stripped? Could happen if `s.strip()` doesn't strip a non-ASCII whitespace? Python str.strip strips all Unicode whitespace. internal separator? no. But if text is "1h \u00a0" strip removes nbsp? Actually strip removes Unicode whitespace incl nbsp? Python's str.strip uses Py_UNICODE_ISSPACE, yes. So no. If text contains spaces only internal impossible. But for safety after skip if i == n: raise? Let's consider if input `1h\u200b` zero-width space not stripped? Maybe internal char after unit. top if text[i] not space then not digit raise. Good. If text="1h  " strip removes. So not issue. But can add if after skip reaches end raise ValueError to enforce not trailing separators? But trailing separators allowed by spec? It says separated by one or more spaces; leading/trailing whitespace allowed. So trailing spaces are allowed. Strip removes. But if we don't want to strip all? We do. After strip, trailing spaces removed. If there were trailing tabs allowed? Leading/trailing whitespace yes. Fine.

But if text is empty? raise.

Could there be spaces between units? "1d h" -> after skip char 'h' not digit raise. Good.

Could there be spaces before a number in the middle of a number? "1 0m" -> after 1 require unit, sees space raise. Good.

Potential hidden requirement: "Parts may be written together or separated by one or more spaces" means no spaces inside part, but spaces can separate only parts. Our scanner allows spaces before part after previous part. It also allows arbitrary multiple spaces. Good.

Need final answer only code block. Could include type hints. No tests.

Need ensure no printing. Good.

Alternative regex:
```
import re
PATTERN = re.compile(r'\s*(0|[1-9]\d*)d(?: +(0|[1-9]\d*)h)?(?: +(0|[1-9]\d*)m)?(?: +(0|[1-9]\d*)s)?\s*')
```
But order with optional groups separated only spaces fails when written together e.g. "1h30m" because groups require space. Could use `(?:...)?` with optional spaces before each next group but not before first? Need ensure no leading spaces before first? can use `(?:0|[1-9]\d*)` then for each subsequent unit `(?: *)`. But if no spaces allowed? optional spaces. But regex with `(?: *...)` could allow spaces before first if preceded? Need no. Also regex with leading/trailing whitespace. Simpler manual.

But manual could allow a part after spaces without previous part? No because after strip first char must digit.

Need check order of unit: If input has unit repeated but later in order? `1h1m1h` after h m then h (idx 1 <= prev2) raise. Good.

Should we raise ValueError if unit order wrong even if numeric part invalid? yes.

Potential issue with large whitespace internal not spaces: If spec says leading/trailing whitespace allowed, maybe they test "\n1h30m\n" accepted. We do. If they test "1h\t30m", maybe they consider tab a separator? They say spaces, likely invalid. But if they use `re.split()` they'd accept tab. However explicit other separators raise, tab may be other separator. Good.

Could there be Unicode digit? `str.isdigit()` true for superscripts? Then `int` would fail? Actually int handles Unicode decimal? For superscript maybe? E.g. '²'.isdigit true but int('²') ValueError. But we manually parse digits with ord? We used `text[i].isdigit()` and compute num using? If we compute char by char as ord(ch)-48, but Unicode digits not in ASCII; `ord('²') - 48` weird. We need restrict to ASCII digits or use int(ch) safely? If `isdigit` returns True for non-ASCII, int(ch) might work for some (decimal digits). Better restrict to ASCII: `'0' <= ch <= '9'`. This is more precise. Let's implement digit check `ch.isdigit()`? To avoid Unicode, use `if not ('0' <= text[i] <= '9')`. In reading loop, same. Then non-ASCII digit raises. Good.

Need maybe not allow negative signs: sign not digit raise. Decimal point raises. Good.

What about plus sign? raise. Good.

Potential issue: empty part due to spaces at end? strip removes. If there are multiple spaces internal, okay. If text is `1h  30m  ` strip removes. Good. If there are spaces inside but also no next part? strip removes trailing; if there are spaces after a part and then non-printable not stripped? no.

Should we use `text = s.strip(' ')` rather than `strip()` to only allow spaces leading/trailing? It says whitespace. But if leading tab, maybe should be allowed. Use `strip()`.

But then if internal non-space whitespace like tab between parts, top skip only `' '` and raise. Good. If internal vertical tab? raise.

Should we allow multiple spaces only, not tabs, but leading/trailing tabs allowed via strip. Good.

One nuance: `s.strip()` will remove leading and trailing form feeds, but if internal form feed, raise. Good.

Another nuance: If input has non-ASCII space internal, `text[i]==' '` false. If char.isdigit false, raise. Good.

Should we use function name exactly parse_duration. Good.

Need no example.

Now final with code only. Ensure code syntactically correct.

Potential hidden test: "1h 0m" accepted. Good.

Could "0" return 0? no unit -> raise. Good.

Could "0d" return 0. Valid. If all zero units order, returns 0. Good.

Potential hidden test: "00d01h" accepted. If they wanted no leading zeros? uncertain. Could add regex to disallow leading zeros? Hmm. Let's examine wording: `<non-negative integer>` normally means decimal notation; leading zeros are ambiguous. In programming contests, often allow leading zeros unless specified. I think okay.

Maybe they expect regex `^(0|[1-9]\d*)`? Many duration parsers require no leading zeros because "anything else"? But "01d" is a non-negative integer? In formal grammar, integer often no leading zeros? Not necessarily. The spec says anything else raises: "decimals, signs" not leading zeros. So allow.

Need maybe disallow uppercase only. Our unit dict lower. Good.

Potential hidden: input "1h1m1s1d" wrong order, raise. Good.

Potential hidden: input "1h 1m" accepted. Good.

Potential hidden: input "1h 1m " strip accepted. Good.

Potential hidden: input " 1h  " accepted. Good.

Potential hidden: input "" raise. Good.

Let's ensure `ValueError` message optional. Fine.

Now final code block. But ensure not include imports. Good.
