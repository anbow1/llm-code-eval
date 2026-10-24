from fractions import Fraction

_FUNCTIONS = {"abs", "min", "max"}


def _tokenize(text: str) -> list[tuple[str, object]]:
    tokens: list[tuple[str, object]] = []
    i = 0
    n = len(text)

    while i < n:
        c = text[i]

        if c.isspace():
            i += 1
            continue

        if "0" <= c <= "9" or c == ".":
            start = i

            if c == ".":
                if i + 1 >= n or not ("0" <= text[i + 1] <= "9"):
                    raise ValueError("invalid number")
                i += 1
                while i < n and "0" <= text[i] <= "9":
                    i += 1
            else:
                while i < n and "0" <= text[i] <= "9":
                    i += 1
                if i < n and text[i] == ".":
                    i += 1
                    while i < n and "0" <= text[i] <= "9":
                        i += 1

            literal = text[start:i]
            if literal.endswith("."):
                literal = literal[:-1]

            tokens.append(("NUM", Fraction(literal)))
            continue

        if ("A" <= c <= "Z") or ("a" <= c <= "z") or c == "_":
            start = i
            i += 1
            while i < n:
                ch = text[i]
                if (
                    ("A" <= ch <= "Z")
                    or ("a" <= ch <= "z")
                    or ("0" <= ch <= "9")
                    or ch == "_"
                ):
                    i += 1
                else:
                    break
            tokens.append(("NAME", text[start:i]))
            continue

        if c == "(":
            tokens.append(("LPAREN", c))
            i += 1
            continue

        if c == ")":
            tokens.append(("RPAREN", c))
            i += 1
            continue

        if c == ",":
            tokens.append(("COMMA", c))
            i += 1
            continue

        if c in "+-*/^":
            tokens.append(("OP", c))
            i += 1
            continue

        raise ValueError("invalid character")

    return tokens


class _Parser:
    def __init__(self, tokens: list[tuple[str, object]], variables: dict | None):
        self.tokens = tokens
        self.pos = 0
        self.variables = variables if variables is not None else {}

    def peek(self) -> tuple[str, object] | None:
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return None

    def advance(self) -> tuple[str, object]:
        token = self.peek()
        if token is None:
            raise ValueError("unexpected end of expression")
        self.pos += 1
        return token

    def expect(self, kind: str) -> tuple[str, object]:
        token = self.peek()
        if token is None or token[0] != kind:
            raise ValueError("syntax error")
        self.pos += 1
        return token

    def parse(self) -> Fraction:
        if not self.tokens:
            raise ValueError("empty expression")

        value = self.expression()

        if self.pos != len(self.tokens):
            raise ValueError("trailing tokens")

        return value

    def expression(self) -> Fraction:
        value = self.term()

        while True:
            token = self.peek()
            if token is not None and token[0] == "OP" and token[1] in ("+", "-"):
                self.pos += 1
                rhs = self.term()
                if token[1] == "+":
                    value += rhs
                else:
                    value -= rhs
            else:
                break

        return value

    def term(self) -> Fraction:
        value = self.unary()

        while True:
            token = self.peek()
            if token is not None and token[0] == "OP" and token[1] in ("*", "/"):
                self.pos += 1
                rhs = self.unary()
                if token[1] == "*":
                    value *= rhs
                else:
                    if rhs == 0:
                        raise ZeroDivisionError("division by zero")
                    value /= rhs
            else:
                break

        return value

    def unary(self) -> Fraction:
        token = self.peek()

        if token is not None and token[0] == "OP" and token[1] in ("+", "-"):
            self.pos += 1
            value = self.unary()
            return value if token[1] == "+" else -value

        return self.power()

    def power(self) -> Fraction:
        base = self.primary()

        token = self.peek()
        if token is not None and token[0] == "OP" and token[1] == "^":
            self.pos += 1
            exponent = self.unary()

            if exponent.denominator != 1:
                raise ValueError("exponent must be an integer")

            exp = exponent.numerator

            if base == 0 and exp < 0:
                raise ZeroDivisionError("zero raised to a negative power")

            base = base ** exp

        return base

    def primary(self) -> Fraction:
        token = self.peek()

        if token is None:
            raise ValueError("syntax error")

        kind, value = token

        if kind == "NUM":
            self.pos += 1
            return value  # type: ignore[return-value]

        if kind == "NAME":
            self.pos += 1
            name = value  # type: ignore[assignment]

            next_token = self.peek()

            if name in _FUNCTIONS:
                if next_token is None or next_token[0] != "LPAREN":
                    raise ValueError("function must be followed by '('")
                return self.function_call(name)

            if next_token is not None and next_token[0] == "LPAREN":
                raise ValueError("unknown function")

            if name not in self.variables:
                raise NameError(f"unknown variable: {name}")

            return Fraction(self.variables[name])

        if kind == "LPAREN":
            self.pos += 1
            value = self.expression()
            self.expect("RPAREN")
            return value

        raise ValueError("syntax error")

    def function_call(self, name: str) -> Fraction:
        self.expect("LPAREN")

        args: list[Fraction] = []

        if self.peek() is not None and self.peek()[0] == "RPAREN":
            self.expect("RPAREN")
        else:
            while True:
                args.append(self.expression())

                token = self.peek()
                if token is not None and token[0] == "COMMA":
                    self.pos += 1
                    continue
                if token is not None and token[0] == "RPAREN":
                    self.pos += 1
                    break

                raise ValueError("syntax error in function call")

        if name == "abs":
            if len(args) != 1:
                raise ValueError("abs takes exactly one argument")
            return abs(args[0])

        if name == "min":
            if len(args) < 1:
                raise ValueError("min takes at least one argument")
            return min(args)

        if name == "max":
            if len(args) < 1:
                raise ValueError("max takes at least one argument")
            return max(args)

        raise ValueError("unknown function")


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    tokens = _tokenize(expr)
    return _Parser(tokens, variables).parse()
