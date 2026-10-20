import re
from fractions import Fraction


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    if variables is None:
        variables = {}

    tokens = _tokenize(expr)
    pos = [0]

    def peek():
        if pos[0] < len(tokens):
            return tokens[pos[0]]
        return None

    def consume():
        tok = tokens[pos[0]]
        pos[0] += 1
        return tok

    def expect(tok_type, val=None):
        if pos[0] >= len(tokens) or tokens[pos[0]][0] != tok_type:
            raise ValueError("syntax error")
        if val is not None and tokens[pos[0]][1] != val:
            raise ValueError("syntax error")
        return consume()

    def parse_expr():
        val = parse_term()
        while peek() and peek()[0] == 'OP' and peek()[1] in ('+', '-'):
            op = consume()[1]
            rhs = parse_term()
            if op == '+':
                val = val + rhs
            else:
                val = val - rhs
        return val

    def parse_term():
        val = parse_factor()
        while peek() and peek()[0] == 'OP' and peek()[1] in ('*', '/'):
            op = consume()[1]
            rhs = parse_factor()
            if op == '*':
                val = val * rhs
            else:
                if rhs == 0:
                    raise ZeroDivisionError("division by zero")
                val = val / rhs
        return val

    def parse_factor():
        if peek() and peek()[0] == 'OP' and peek()[1] in ('+', '-'):
            sign = consume()[1]
            val = parse_factor()
            return -val if sign == '-' else val
        return parse_power()

    def parse_power():
        base = parse_atom()
        if peek() and peek()[0] == 'OP' and peek()[1] == '^':
            consume()
            exp = parse_factor()
            if exp.denominator != 1:
                raise ValueError("exponent must be an integer")
            exp_int = int(exp)
            if base == 0 and exp_int < 0:
                raise ZeroDivisionError("0 raised to a negative power")
            return base ** exp_int
        return base

    def parse_atom():
        tok = peek()
        if tok is None:
            raise ValueError("syntax error")

        if tok[0] == 'NUM':
            consume()
            return Fraction(tok[1])

        if tok[0] == 'IDENT':
            name = consume()[1]
            if peek() and peek()[0] == 'LPAREN':
                consume()  # (
                args = []
                if peek() and peek()[0] == 'RPAREN':
                    raise ValueError("syntax error")
                args.append(parse_expr())
                while peek() and peek()[0] == 'COMMA':
                    consume()
                    args.append(parse_expr())
                expect('RPAREN')
                return _apply_func(name, args)
            else:
                if name in ('abs', 'min', 'max'):
                    raise ValueError("syntax error")
                if name in variables:
                    return Fraction(variables[name])
                raise NameError(f"unknown variable: {name}")

        if tok[0] == 'LPAREN':
            consume()
            val = parse_expr()
            expect('RPAREN')
            return val

        raise ValueError("syntax error")

    result = parse_expr()
    if pos[0] < len(tokens):
        raise ValueError("syntax error")

    return Fraction(result)


def _tokenize(expr: str):
    tokens = []
    i = 0
    n = len(expr)
    num_re = re.compile(r'[0-9]+\.?[0-9]*|\.[0-9]+')
    ident_re = re.compile(r'[A-Za-z_][A-Za-z0-9_]*')

    while i < n:
        ch = expr[i]
        if ch.isspace():
            i += 1
            continue

        if ch.isdigit() or ch == '.':
            m = num_re.match(expr, i)
            if not m:
                raise ValueError("syntax error")
            tokens.append(('NUM', m.group()))
            i = m.end()
            continue

        if ch.isalpha() or ch == '_':
            m = ident_re.match(expr, i)
            tokens.append(('IDENT', m.group()))
            i = m.end()
            continue

        if ch in '+-*/^':
            tokens.append(('OP', ch))
            i += 1
            continue

        if ch == '(':
            tokens.append(('LPAREN', '('))
            i += 1
            continue

        if ch == ')':
            tokens.append(('RPAREN', ')'))
            i += 1
            continue

        if ch == ',':
            tokens.append(('COMMA', ','))
            i += 1
            continue

        raise ValueError("syntax error")

    return tokens


def _apply_func(name, args):
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
        raise ValueError(f"unknown function: {name}")
