Need regex-based parser. Pattern per part: (\d+)([dhms]). Must match full string with optional spaces between parts, units in order d,h,m,s, each at most once.

Approach: use regex with backreferences? Simpler: tokenize with re.findall(r'(\d+)([dhms])', s) but that would skip invalid chars. Better: match whole string with a regex like:

^\s*(?:\d+[dhms](?:\s+\d+[dhms])*|\d+[dhms])\s*$ then parse parts, then validate order/uniqueness. Order validation: extract units, check they equal a subsequence of "dhms" strictly in increasing order — i.e., units sorted? Since order d,h,m,s required, units must appear in that relative order, each once. Check: units list — indices in "dhms" strictly increasing. Also each unit once.

Regex: r'^\s*((?:\d+[dhms])(?:\s+\d+[dhms])*)\s*$' then findall parts. If no match, ValueError. Also need fullmatch.

Then for each part, unit index; require strictly increasing indices.

Compute seconds with weights {'d':86400,'h':3600,'m':60,'s':1}.

Edge: "0" alone — number without unit → fails regex → ValueError. Good.

Leading zeros fine.