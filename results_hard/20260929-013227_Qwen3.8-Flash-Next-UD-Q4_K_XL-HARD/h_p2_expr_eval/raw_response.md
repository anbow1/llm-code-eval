```python
from fractions import Fraction


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    if variables is None:
        variables = {}

    tokens = _tokenize(expr)
    if not tokens:
        raise ValueError("empty expression")

    pos = [0]

    def peek():
        if pos[0] < len(tokens):
            return tokens[pos[0]]
        return None

    def consume():
        tok = tokens[pos[0]]
        pos[0] += 1
        return tok

    def expect(typ):
        tok = peek()
        if tok is None or tok[0] != typ:
            raise ValueError(f"expected {typ}")
        return consume()

    def parse_expr():
        return parse_addsub()

    def parse_addsub():
        left = parse_muldiv()
        while peek() is not None and peek()[0] == 'op' and peek()[1] in ('+', '-'):
            op = consume()[1]
            right = parse_muldiv()
            if op == '+':
                left = left + right
            else:
                left = left - right
        return left

    def parse_muldiv():
        left = parse_unary()
        while peek() is not None and peek()[0] == 'op' and peek()[1] in ('*', '/'):
            op = consume()[1]
            right = parse_unary()
            if op == '*':
                left = left * right
            else:
                if right == 0:
                    raise ZeroDivisionError("division by zero")
                left = left / right
        return left

    def parse_unary():
        if peek() is not None and peek()[0] == 'op' and peek()[1] in ('+', '-'):
            tok = consume()
            operand = parse_unary()
            return -operand if tok[1] == '-' else operand
        return parse_power()

    def parse_power():
        base = parse_atom()
        if peek() is not None and peek()[0] == 'op' and peek()[1] == '^':
            consume()
            exp = parse_unary()
            if exp.denominator != 1:
                raise ValueError("exponent must be an integer")
            exp_int = exp.numerator
            if base == 0 and exp_int < 0:
                raise ZeroDivisionError("zero to negative power")
            if exp_int >= 0:
                return base ** exp_int
            else:
                return Fraction(1) / (base ** (-exp_int))
        return base

    def parse_atom():
        tok = peek()
        if tok is None:
            raise ValueError("unexpected end of expression")

        if tok[0] == 'num':
            consume()
            return tok[1]

        if tok[0] == 'id':
            consume()
            name = tok[1]
            if peek() is not None and peek()[0] == 'lparen':
                consume()
                args = parse_args()
                expect('rparen')
                return _call_function(name, args)
            else:
                if name in ('abs', 'min', 'max'):
                    raise ValueError(f"expected ( after function name '{name}'")
                if name in variables:
                    v = variables[name]
                    if isinstance(v, Fraction):
                        return v
                    if isinstance(v, int):
                        return Fraction(v)
                    raise NameError(f"unknown variable '{name}'")
                raise NameError(f"unknown variable '{name}'")

        if tok[0] == 'lparen':
            consume()
            val = parse_expr()
            expect('rparen')
            return val

        raise ValueError(f"unexpected token '{tok[1]}'")

    def parse_args():
        args = []
        if peek() is not None and peek()[0] == 'rparen':
            return args
        args.append(parse_expr())
        while peek() is not None and peek()[0] == 'comma':
            consume()
            args.append(parse_expr())
        return args

    result = parse_expr()
    if pos[0] < len(tokens):
        raise ValueError("unexpected trailing token")
    return result


def _call_function(name, args):
    if name == 'abs':
        if len(args) != 1:
            raise ValueError("abs() takes exactly 1 argument")
        return abs(args[0])
    elif name == 'min':
        if len(args) < 1:
            raise ValueError("min() requires at least 1 argument")
        return min(args)
    elif name == 'max':
        if len(args) < 1:
            raise ValueError("max() requires at least 1 argument")
        return max(args)
    else:
        raise ValueError(f"unknown function '{name}'")


def _tokenize(expr: str):
    tokens = []
    i = 0
    n = len(expr)

    while i < n:
        ch = expr[i]

        if ch.isspace():
            i += 1
            continue

        if ch.isdigit() or (ch == '.' and i + 1 < n and expr[i + 1].isdigit()):
            j = i
            if ch == '.':
                j += 1
                while j < n and expr[j].isdigit():
                    j += 1
                num_str = '0' + expr[i:j]
            else:
                while j < n and expr[j].isdigit():
                    j += 1
                if j < n and expr[j] == '.':
                    j += 1
                    while j < n and expr[j].isdigit():
                        j += 1
                    num_str = expr[i:j]
                    if num_str.endswith('.'):
                        num_str = num_str[:-1]
                else:
                    num_str = expr[i:j]
            tokens.append(('num', Fraction(num_str)))
            i = j
            continue

        if ch.isalpha() or ch == '_':
            j = i
            while j < n and (expr[j].isalnum() or expr[j] == '_'):
                j += 1
            tokens.append(('id', expr[i:j]))
            i = j
            continue

        if ch in '+-*/^':
            tokens.append(('op', ch))
            i += 1
            continue

        if ch == '(':
            tokens.append(('lparen', ch))
            i += 1
            continue

        if ch == ')':
            tokens.append(('rparen', ch))
            i += 1
            continue

        if ch == ',':
            tokens.append(('comma', ch))
            i += 1
            continue

        raise ValueError(f"unknown character '{ch}'")

    return tokens
```