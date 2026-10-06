```python
import fractions


def _tokenize(expr: str):
    tokens = []
    i = 0
    n = len(expr)

    while i < n:
        ch = expr[i]

        if ch.isspace():
            i += 1
            continue

        # Number: digits[.digits] or .digits
        if ch.isdigit() or (ch == '.' and i + 1 < n and expr[i + 1].isdigit()):
            start = i
            if ch == '.':
                i += 1
                while i < n and expr[i].isdigit():
                    i += 1
            else:
                while i < n and expr[i].isdigit():
                    i += 1
                if i < n and expr[i] == '.':
                    i += 1
                    while i < n and expr[i].isdigit():
                        i += 1
            num_str = expr[start:i]
            tokens.append(('num', fractions.Fraction(num_str)))
            continue

        # Lone dot not followed by digit → error
        if ch == '.':
            raise ValueError("Syntax error")

        # Identifier / function name
        if ch.isalpha() or ch == '_':
            start = i
            while i < n and (expr[i].isalnum() or expr[i] == '_'):
                i += 1
            tokens.append(('name', expr[start:i]))
            continue

        if ch in '+-*/^':
            tokens.append(('op', ch))
            i += 1
            continue

        if ch == '(':
            tokens.append(('lparen', '('))
            i += 1
            continue

        if ch == ')':
            tokens.append(('rparen', ')'))
            i += 1
            continue

        if ch == ',':
            tokens.append(('comma', ','))
            i += 1
            continue

        raise ValueError(f"Syntax error: unexpected character '{ch}'")

    return tokens


def evaluate(expr: str, variables: dict | None = None) -> fractions.Fraction:
    if variables is None:
        variables = {}

    tokens = _tokenize(expr)

    if not tokens:
        raise ValueError("Empty expression")

    pos = [0]

    def peek():
        if pos[0] < len(tokens):
            return tokens[pos[0]]
        return None

    def consume():
        tok = tokens[pos[0]]
        pos[0] += 1
        return tok

    def expect(ttype):
        tok = peek()
        if tok is None or tok[0] != ttype:
            raise ValueError("Syntax error")
        return consume()

    # expr := term (('+' | '-') term)*
    def parse_expr():
        val = parse_term()
        while peek() is not None and peek()[0] == 'op' and peek()[1] in ('+', '-'):
            op = consume()[1]
            right = parse_term()
            if op == '+':
                val = val + right
            else:
                val = val - right
        return val

    # term := unary (('*' | '/') unary)*
    def parse_term():
        val = parse_unary()
        while peek() is not None and peek()[0] == 'op' and peek()[1] in ('*', '/'):
            op = consume()[1]
            right = parse_unary()
            if op == '*':
                val = val * right
            else:
                if right == 0:
                    raise ZeroDivisionError("Division by zero")
                val = val / right
        return val

    # unary := ('+' | '-') unary | power
    def parse_unary():
        if peek() is not None and peek()[0] == 'op' and peek()[1] in ('+', '-'):
            op = consume()[1]
            val = parse_unary()
            return -val if op == '-' else val
        return parse_power()

    # power := atom ('^' unary)?   — right-associative via recursion in unary
    def parse_power():
        base = parse_atom()
        if peek() is not None and peek()[0] == 'op' and peek()[1] == '^':
            consume()
            exp = parse_unary()  # allows unary sign after ^, and recurses for right-assoc
            if exp.denominator != 1:
                raise ValueError("Exponent must be an integer")
            exp_int = exp.numerator
            if base == 0 and exp_int < 0:
                raise ZeroDivisionError("Zero to a negative power")
            if exp_int >= 0:
                return base ** exp_int
            else:
                return fractions.Fraction(1, 1) / (base ** (-exp_int))
        return base

    # atom := number | name '(' args ')' | name | '(' expr ')'
    def parse_atom():
        tok = peek()
        if tok is None:
            raise ValueError("Syntax error: unexpected end of expression")

        if tok[0] == 'num':
            consume()
            return tok[1]

        if tok[0] == 'name':
            name = consume()[1]
            # Check for function call
            if peek() is not None and peek()[0] == 'lparen':
                consume()  # (
                args = parse_args()
                expect('rparen')
                return _call_func(name, args)
            # Variable lookup
            if name in variables:
                return fractions.Fraction(variables[name])
            raise NameError(f"Unknown variable: {name}")

        if tok[0] == 'lparen':
            consume()
            val = parse_expr()
            expect('rparen')
            return val

        raise ValueError("Syntax error")

    # args := [expr (',' expr)*]
    def parse_args():
        args = []
        if peek() is not None and peek()[0] == 'rparen':
            return args
        args.append(parse_expr())
        while peek() is not None and peek()[0] == 'comma':
            consume()
            args.append(parse_expr())
        return args

    def _call_func(name, args):
        if name == 'abs':
            if len(args) != 1:
                raise ValueError("abs() takes exactly 1 argument")
            return abs(args[0])
        if name == 'min':
            if len(args) < 1:
                raise ValueError("min() requires at least 1 argument")
            return min(args)
        if name == 'max':
            if len(args) < 1:
                raise ValueError("max() requires at least 1 argument")
            return max(args)
        raise ValueError(f"Unknown function: {name}")

    result = parse_expr()

    if pos[0] != len(tokens):
        raise ValueError("Syntax error: trailing tokens")

    return result
```