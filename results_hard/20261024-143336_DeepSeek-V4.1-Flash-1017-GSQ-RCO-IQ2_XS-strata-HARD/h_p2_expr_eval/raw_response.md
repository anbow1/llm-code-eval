```python
from fractions import Fraction

_FUNCTIONS = {"abs", "min", "max"}


def _is_ascii_digit(ch: str) -> bool:
    return "0" <= ch <= "9"


def _is_ident_start(ch: str) -> bool:
    return ("A" <= ch <= "Z") or ("a" <= ch <= "z") or ch == "_"


def _is_ident_char(ch: str) -> bool:
    return _is_ident_start(ch) or _is_ascii_digit(ch)


def _tokenize(text: str):
    tokens = []
    i = 0
    n = len(text)

    while i < n:
        ch = text[i]

        if ch.isspace():
            i += 1
            continue

        if ch in "+-*/^":
            tokens.append(("OP", ch))
            i += 1
            continue

        if ch == "(":
            tokens.append(("LPAREN", ch))
            i += 1
            continue

        if ch == ")":
            tokens.append(("RPAREN", ch))
            i += 1
            continue

        if ch == ",":
            tokens.append(("COMMA", ch))
            i += 1
            continue

        if _is_ascii_digit(ch) or ch == ".":
            start = i

            if ch == ".":
                i += 1
                if i >= n or not _is_ascii_digit(text[i]):
                    raise ValueError("Invalid number")
                while i < n and _is_ascii_digit(text[i]):
                    i += 1
            else:
                while i < n and _is_ascii_digit(text[i]):
                    i += 1
                if i < n and text[i] == ".":
                    i += 1
                    while i < n and _is_ascii_digit(text[i]):
                        i += 1

            tokens.append(("NUMBER", text[start:i]))
            continue

        if _is_ident_start(ch):
            start = i
            i += 1
            while i < n and _is_ident_char(text[i]):
                i += 1
            tokens.append(("IDENT", text[start:i]))
            continue

        raise ValueError(f"Unexpected character: {ch!r}")

    tokens.append(("EOF", None))
    return tokens


def _number_to_fraction(text: str) -> Fraction:
    if text.startswith("."):
        text = "0" + text
    if text.endswith("."):
        text = text[:-1]
    return Fraction(text)


class _Parser:
    def __init__(self, tokens, variables):
        self.tokens = tokens
        self.pos = 0
        self.variables = variables

    def peek(self):
        return self.tokens[self.pos]

    def advance(self):
        token = self.tokens[self.pos]
        self.pos += 1
        return token

    def parse_expression(self) -> Fraction:
        value = self.parse_product()

        while self.peek()[0] == "OP" and self.peek()[1] in ("+", "-"):
            op = self.advance()[1]
            rhs = self.parse_product()
            value = value + rhs if op == "+" else value - rhs

        return value

    def parse_product(self) -> Fraction:
        value = self.parse_unary()

        while self.peek()[0] == "OP" and self.peek()[1] in ("*", "/"):
            op = self.advance()[1]
            rhs = self.parse_unary()

            if op == "*":
                value = value * rhs
            else:
                if rhs == 0:
                    raise ZeroDivisionError("Division by zero")
                value = value / rhs

        return value

    def parse_unary(self) -> Fraction:
        sign = 1

        while self.peek()[0] == "OP" and self.peek()[1] in ("+", "-"):
            if self.advance()[1] == "-":
                sign = -sign

        value = self.parse_power()
        return value if sign == 1 else -value

    def parse_power(self) -> Fraction:
        base = self.parse_primary()

        if self.peek()[0] == "OP" and self.peek()[1] == "^":
            self.advance()
            exponent = self.parse_unary()

            if exponent.denominator != 1:
                raise ValueError("Exponent must be an integer")

            exp = exponent.numerator

            if base == 0 and exp < 0:
                raise ZeroDivisionError("Zero cannot be raised to a negative power")

            return base ** exp

        return base

    def parse_primary(self) -> Fraction:
        token_type, value = self.peek()

        if token_type == "NUMBER":
            self.advance()
            return _number_to_fraction(value)

        if token_type == "IDENT":
            name = self.advance()[1]

            if self.peek()[0] == "LPAREN":
                if name not in _FUNCTIONS:
                    raise ValueError(f"Unknown function: {name}")

                self.advance()  # consume '('
                args = self.parse_call_args()

                if name == "abs":
                    if len(args) != 1:
                        raise ValueError("abs expects exactly 1 argument")
                    x = args[0]
                    return -x if x < 0 else x

                if name == "min":
                    if len(args) < 1:
                        raise ValueError("min expects at least 1 argument")
                    return min(args)

                if name == "max":
                    if len(args) < 1:
                        raise ValueError("max expects at least 1 argument")
                    return max(args)

                raise ValueError(f"Unknown function: {name}")

            if name in _FUNCTIONS:
                raise ValueError(f"Function {name} requires parentheses")

            if name not in self.variables:
                raise NameError(f"Unknown variable: {name}")

            variable_value = self.variables[name]
            if isinstance(variable_value, Fraction):
                return variable_value
            return Fraction(variable_value)

        if token_type == "LPAREN":
            self.advance()
            value = self.parse_expression()

            if self.peek()[0] != "RPAREN":
                raise ValueError("Expected closing parenthesis")

            self.advance()
            return value

        raise ValueError("Unexpected token")

    def parse_call_args(self):
        args = []

        if self.peek()[0] == "RPAREN":
            self.advance()
            return args

        while True:
            args.append(self.parse_expression())

            if self.peek()[0] == "COMMA":
                self.advance()
            elif self.peek()[0] == "RPAREN":
                self.advance()
                break
            else:
                raise ValueError("Expected ',' or ')' in function call")

        return args


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    if variables is None:
        variables = {}

    tokens = _tokenize(expr)
    parser = _Parser(tokens, variables)
    result = parser.parse_expression()

    if parser.peek()[0] != "EOF":
        raise ValueError("Unexpected trailing tokens")

    return result
```