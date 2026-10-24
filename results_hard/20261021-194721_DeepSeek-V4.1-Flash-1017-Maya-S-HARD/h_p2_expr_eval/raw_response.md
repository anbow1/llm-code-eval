```python
import re
from fractions import Fraction


NUMBER_RE = re.compile(r'\d+\.\d*|\.\d+|\d+')
NAME_RE = re.compile(r'[A-Za-z_][A-Za-z0-9_]*')


def _parse_number(text: str) -> Fraction:
    if '.' not in text:
        return Fraction(int(text))

    integer_part, fraction_part = text.split('.', 1)
    whole = int(integer_part) if integer_part else 0

    if fraction_part:
        denom = 10 ** len(fraction_part)
        return Fraction(whole * denom + int(fraction_part), denom)

    return Fraction(whole)


def _tokenize(expr: str):
    tokens = []
    i = 0
    n = len(expr)

    while i < n:
        ch = expr[i]

        if ch.isspace():
            i += 1
            continue

        match = NUMBER_RE.match(expr, i)
        if match is not None:
            tokens.append(('num', match.group(0)))
            i = match.end()
            continue

        match = NAME_RE.match(expr, i)
        if match is not None:
            tokens.append(('name', match.group(0)))
            i = match.end()
            continue

        if ch in '+-*/^(),':
            tokens.append((ch, ch))
            i += 1
            continue

        raise ValueError(f'invalid character: {ch!r}')

    return tokens


class _Parser:
    def __init__(self, tokens):
        self.tokens = tokens
        self.pos = 0

    def peek(self):
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return None

    def advance(self):
        token = self.tokens[self.pos]
        self.pos += 1
        return token

    def parse(self):
        return self.parse_additive()

    def parse_additive(self):
        node = self.parse_multiplicative()

        while True:
            token = self.peek()
            if token is not None and token[0] in ('+', '-'):
                op = token[0]
                self.advance()
                right = self.parse_multiplicative()
                node = ('bin', op, node, right)
            else:
                break

        return node

    def parse_multiplicative(self):
        node = self.parse_unary()

        while True:
            token = self.peek()
            if token is not None and token[0] in ('*', '/'):
                op = token[0]
                self.advance()
                right = self.parse_unary()
                node = ('bin', op, node, right)
            else:
                break

        return node

    def parse_unary(self):
        token = self.peek()

        if token is not None and token[0] in ('+', '-'):
            op = token[0]
            self.advance()
            return ('unary', op, self.parse_unary())

        return self.parse_power()

    def parse_power(self):
        base = self.parse_atom()

        token = self.peek()
        if token is not None and token[0] == '^':
            self.advance()
            exponent = self.parse_unary()
            return ('bin', '^', base, exponent)

        return base

    def parse_atom(self):
        token = self.peek()

        if token is None:
            raise ValueError('unexpected end of expression')

        kind = token[0]

        if kind == 'num':
            self.advance()
            return ('num', _parse_number(token[1]))

        if kind == 'name':
            self.advance()
            name = token[1]

            next_token = self.peek()
            if next_token is not None and next_token[0] == '(':
                self.advance()
                args = []

                next_token = self.peek()
                if next_token is not None and next_token[0] == ')':
                    self.advance()
                    return ('call', name, args)

                args.append(self.parse_additive())

                while True:
                    next_token = self.peek()
                    if next_token is not None and next_token[0] == ',':
                        self.advance()
                        args.append(self.parse_additive())
                    else:
                        break

                next_token = self.peek()
                if next_token is None or next_token[0] != ')':
                    raise ValueError('expected closing parenthesis')

                self.advance()
                return ('call', name, args)

            return ('var', name)

        if kind == '(':
            self.advance()
            node = self.parse_additive()

            next_token = self.peek()
            if next_token is None or next_token[0] != ')':
                raise ValueError('expected closing parenthesis')

            self.advance()
            return node

        raise ValueError('unexpected token')


def _evaluate_node(node, variables):
    kind = node[0]

    if kind == 'num':
        return node[1]

    if kind == 'var':
        name = node[1]

        if variables is None or name not in variables:
            raise NameError(name)

        return Fraction(variables[name])

    if kind == 'unary':
        op = node[1]
        value = _evaluate_node(node[2], variables)

        if op == '+':
            return value
        return -value

    if kind == 'bin':
        op = node[1]
        left = _evaluate_node(node[2], variables)
        right = _evaluate_node(node[3], variables)

        if op == '+':
            return left + right

        if op == '-':
            return left - right

        if op == '*':
            return left * right

        if op == '/':
            if right == 0:
                raise ZeroDivisionError('division by zero')
            return left / right

        if op == '^':
            if right.denominator != 1:
                raise ValueError('exponent must be an integer')

            exponent = right.numerator

            if exponent < 0:
                if left == 0:
                    raise ZeroDivisionError('zero raised to a negative exponent')
                return Fraction(1) / (left ** (-exponent))

            return left ** exponent

        raise ValueError('unknown operator')

    if kind == 'call':
        name = node[1]
        arg_nodes = node[2]

        if name not in ('abs', 'min', 'max'):
            raise ValueError(f'unknown function: {name}')

        args = [_evaluate_node(arg, variables) for arg in arg_nodes]

        if name == 'abs':
            if len(args) != 1:
                raise ValueError('abs takes exactly one argument')
            return abs(args[0])

        if name == 'min':
            if len(args) < 1:
                raise ValueError('min takes at least one argument')
            return min(args)

        if name == 'max':
            if len(args) < 1:
                raise ValueError('max takes at least one argument')
            return max(args)

    raise ValueError('invalid expression')


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    tokens = _tokenize(expr)
    parser = _Parser(tokens)

    node = parser.parse()

    if parser.pos != len(tokens):
        raise ValueError('unexpected trailing tokens')

    return _evaluate_node(node, variables)
```