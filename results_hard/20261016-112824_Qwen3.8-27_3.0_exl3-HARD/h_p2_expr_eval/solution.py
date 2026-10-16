import re
from fractions import Fraction


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    if variables is None:
        variables = {}

    tokens = _tokenize(expr)

    if not tokens:
        raise ValueError("Empty expression")

    pos = [0]
    result = _parse_expr(tokens, pos, variables)

    if pos[0] != len(tokens):
        raise ValueError("Trailing tokens")

    return result


def _tokenize(expr: str) -> list:
    tokens = []
    i = 0
    n = len(expr)

    while i < n:
        ch = expr[i]

        if ch.isspace():
            i += 1
            continue

        if ch.isdigit() or ch == '.':
            m = re.match(r'\d+\.\d*|\.\d+|\d+', expr[i:])
            if m:
                tokens.append(('NUMBER', m.group()))
                i += m.end()
            else:
                raise ValueError(f"Invalid number at position {i}")
            continue

        if ch.isalpha() or ch == '_':
            m = re.match(r'[A-Za-z_][A-Za-z0-9_]*', expr[i:])
            if m:
                tokens.append(('IDENT', m.group()))
                i += m.end()
            else:
                raise ValueError(f"Invalid identifier at position {i}")
            continue

        if ch in '+-*/^(),':
            tokens.append((ch, ch))
            i += 1
            continue

        raise ValueError(f"Invalid character '{ch}' at position {i}")

    return tokens


def _parse_expr(tokens, pos, variables) -> Fraction:
    left = _parse_term(tokens, pos, variables)
    while pos[0] < len(tokens) and tokens[pos[0]][0] in ('+', '-'):
        op = tokens[pos[0]][0]
        pos[0] += 1
        right = _parse_term(tokens, pos, variables)
        if op == '+':
            left = left + right
        else:
            left = left - right
    return left


def _parse_term(tokens, pos, variables) -> Fraction:
    left = _parse_unary(tokens, pos, variables)
    while pos[0] < len(tokens) and tokens[pos[0]][0] in ('*', '/'):
        op = tokens[pos[0]][0]
        pos[0] += 1
        right = _parse_unary(tokens, pos, variables)
        if op == '*':
            left = left * right
        else:
            if right == 0:
                raise ZeroDivisionError("Division by zero")
            left = left / right
    return left


def _parse_unary(tokens, pos, variables) -> Fraction:
    sign = 1
    while pos[0] < len(tokens) and tokens[pos[0]][0] in ('+', '-'):
        if tokens[pos[0]][0] == '-':
            sign = -sign
        pos[0] += 1
    result = _parse_power(tokens, pos, variables)
    return sign * result


def _parse_power(tokens, pos, variables) -> Fraction:
    base = _parse_primary(tokens, pos, variables)
    if pos[0] < len(tokens) and tokens[pos[0]][0] == '^':
        pos[0] += 1
        exponent = _parse_unary(tokens, pos, variables)
        if exponent.denominator != 1:
            raise ValueError("Exponent must be an integer")
        exp_int = exponent.numerator
        if base == 0 and exp_int < 0:
            raise ZeroDivisionError("0 to a negative power")
        return base ** exp_int
    return base


def _parse_primary(tokens, pos, variables) -> Fraction:
    if pos[0] >= len(tokens):
        raise ValueError("Unexpected end of expression")

    tok_type, tok_val = tokens[pos[0]]

    if tok_type == 'NUMBER':
        pos[0] += 1
        return Fraction(tok_val)

    if tok_type == 'IDENT':
        if pos[0] + 1 < len(tokens) and tokens[pos[0] + 1][0] == '(':
            func_name = tok_val
            pos[0] += 1  # consume IDENT
            pos[0] += 1  # consume '('

            args = []
            if pos[0] < len(tokens) and tokens[pos[0]][0] == ')':
                pos[0] += 1
            else:
                args.append(_parse_expr(tokens, pos, variables))
                while pos[0] < len(tokens) and tokens[pos[0]][0] == ',':
                    pos[0] += 1
                    args.append(_parse_expr(tokens, pos, variables))

            if pos[0] >= len(tokens) or tokens[pos[0]][0] != ')':
                raise ValueError("Expected ')'")
            pos[0] += 1

            if func_name == 'abs':
                if len(args) != 1:
                    raise ValueError("abs requires exactly 1 argument")
                return abs(args[0])
            elif func_name == 'min':
                if len(args) < 1:
                    raise ValueError("min requires at least 1 argument")
                return min(args)
            elif func_name == 'max':
                if len(args) < 1:
                    raise ValueError("max requires at least 1 argument")
                return max(args)
            else:
                raise ValueError(f"Unknown function: {func_name}")
        else:
            if tok_val in ('abs', 'min', 'max'):
                raise ValueError(f"Function '{tok_val}' requires parentheses")
            pos[0] += 1
            if tok_val not in variables:
                raise NameError(f"Unknown variable: {tok_val}")
            val = variables[tok_val]
            if isinstance(val, int):
                return Fraction(val)
            return Fraction(val)

    if tok_type == '(':
        pos[0] += 1
        result = _parse_expr(tokens, pos, variables)
        if pos[0] >= len(tokens) or tokens[pos[0]][0] != ')':
            raise ValueError("Expected ')'")
        pos[0] += 1
        return result

    raise ValueError(f"Unexpected token: {tok_val}")
