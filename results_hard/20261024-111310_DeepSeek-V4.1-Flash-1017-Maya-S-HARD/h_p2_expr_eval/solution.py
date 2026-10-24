import fractions


def _is_digit(ch: str) -> bool:
    return '0' <= ch <= '9'


def _is_ident_start(ch: str) -> bool:
    return ('A' <= ch <= 'Z') or ('a' <= ch <= 'z') or ch == '_'


def _is_ident_continue(ch: str) -> bool:
    return _is_ident_start(ch) or _is_digit(ch)


def _parse_number(text: str) -> fractions.Fraction:
    if '.' in text:
        integer, fractional = text.split('.', 1)
        if integer == '':
            integer = '0'
        digits = integer + fractional
        numerator = int(digits) if digits else 0
        denominator = 10 ** len(fractional)
        return fractions.Fraction(numerator, denominator)
    return fractions.Fraction(int(text), 1)


def _tokenize(expr: str) -> list[tuple[str, object]]:
    tokens: list[tuple[str, object]] = []
    i = 0
    n = len(expr)

    while i < n:
        ch = expr[i]

        if ch.isspace():
            i += 1
            continue

        if _is_digit(ch) or ch == '.':
            start = i

            if ch == '.':
                if i + 1 >= n or not _is_digit(expr[i + 1]):
                    raise ValueError("Invalid number")
                i += 1
                while i < n and _is_digit(expr[i]):
                    i += 1
            else:
                while i < n and _is_digit(expr[i]):
                    i += 1
                if i < n and expr[i] == '.':
                    i += 1
                    while i < n and _is_digit(expr[i]):
                        i += 1

            tokens.append(('NUM', _parse_number(expr[start:i])))
            continue

        if _is_ident_start(ch):
            start = i
            i += 1
            while i < n and _is_ident_continue(expr[i]):
                i += 1
            tokens.append(('NAME', expr[start:i]))
            continue

        if ch in '+-*/^(),':
            tokens.append((ch, ch))
            i += 1
            continue

        raise ValueError(f"Unexpected character: {ch!r}")

    tokens.append(('EOF', None))
    return tokens


class _Parser:
    def __init__(self, tokens: list[tuple[str, object]]) -> None:
        self.tokens = tokens
        self.pos = 0

    def _peek(self) -> str:
        return self.tokens[self.pos][0]

    def _advance(self) -> tuple[str, object]:
        token = self.tokens[self.pos]
        self.pos += 1
        return token

    def _match(self, kind: str) -> bool:
        if self._peek() == kind:
            self.pos += 1
            return True
        return False

    def _expect(self, kind: str) -> tuple[str, object]:
        if self._peek() != kind:
            raise ValueError(f"Expected {kind!r}")
        return self._advance()

    def parse(self) -> tuple:
        if self._peek() == 'EOF':
            raise ValueError("Empty expression")

        node = self._parse_additive()

        if self._peek() != 'EOF':
            raise ValueError("Trailing tokens")

        return node

    def _parse_additive(self) -> tuple:
        node = self._parse_multiplicative()

        while self._peek() in ('+', '-'):
            op = self._advance()[0]
            rhs = self._parse_multiplicative()
            node = ('bin', op, node, rhs)

        return node

    def _parse_multiplicative(self) -> tuple:
        node = self._parse_unary()

        while self._peek() in ('*', '/'):
            op = self._advance()[0]
            rhs = self._parse_unary()
            node = ('bin', op, node, rhs)

        return node

    def _parse_unary(self) -> tuple:
        if self._peek() in ('+', '-'):
            op = self._advance()[0]
            node = self._parse_unary()
            return ('unary', op, node)

        return self._parse_power()

    def _parse_power(self) -> tuple:
        base = self._parse_primary()

        if self._match('^'):
            exponent = self._parse_unary()
            return ('bin', '^', base, exponent)

        return base

    def _parse_primary(self) -> tuple:
        kind, value = self.tokens[self.pos]

        if kind == 'NUM':
            self.pos += 1
            return ('num', value)

        if kind == '(':
            self.pos += 1
            node = self._parse_additive()
            self._expect(')')
            return node

        if kind == 'NAME':
            self.pos += 1
            if self._peek() == '(':
                return self._parse_function(str(value))
            return ('var', value)

        raise ValueError("Expected an expression")

    def _parse_function(self, name: str) -> tuple:
        self._expect('(')
        args: list[tuple] = []

        if self._peek() != ')':
            while True:
                args.append(self._parse_additive())
                if self._match(','):
                    continue
                break

        self._expect(')')
        return ('func', name, args)


def _evaluate_node(node: tuple, variables: dict | None) -> fractions.Fraction:
    tag = node[0]

    if tag == 'num':
        return node[1]

    if tag == 'var':
        name = node[1]
        if variables is not None and name in variables:
            value = variables[name]
            if isinstance(value, fractions.Fraction):
                return value
            return fractions.Fraction(value)
        raise NameError(f"Unknown variable: {name}")

    if tag == 'unary':
        op = node[1]
        value = _evaluate_node(node[2], variables)
        return value if op == '+' else -value

    if tag == 'bin':
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
                raise ZeroDivisionError("Division by zero")
            return left / right
        if op == '^':
            if right.denominator != 1:
                raise ValueError("Exponent must be an integer")
            exponent = right.numerator
            if left == 0 and exponent < 0:
                raise ZeroDivisionError("Zero cannot be raised to a negative power")
            return left ** exponent

        raise ValueError(f"Unknown operator: {op}")

    if tag == 'func':
        name = node[1]
        args = node[2]
        values = [_evaluate_node(arg, variables) for arg in args]

        if name == 'abs':
            if len(values) != 1:
                raise ValueError("abs() takes exactly one argument")
            return abs(values[0])

        if name == 'min':
            if len(values) < 1:
                raise ValueError("min() requires at least one argument")
            return min(values)

        if name == 'max':
            if len(values) < 1:
                raise ValueError("max() requires at least one argument")
            return max(values)

        raise ValueError(f"Unknown function: {name}")

    raise ValueError("Invalid expression")


def evaluate(expr: str, variables: dict | None = None) -> fractions.Fraction:
    tokens = _tokenize(expr)
    parser = _Parser(tokens)
    node = parser.parse()
    return _evaluate_node(node, variables)
