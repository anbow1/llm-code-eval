from fractions import Fraction


def _tokenize(expr: str) -> list[tuple[str, str]]:
    tokens: list[tuple[str, str]] = []
    i = 0
    n = len(expr)

    while i < n:
        c = expr[i]

        if c.isspace():
            i += 1
            continue

        if ("0" <= c <= "9") or c == ".":
            start = i

            if c == ".":
                if i + 1 < n and "0" <= expr[i + 1] <= "9":
                    i += 1
                    while i < n and "0" <= expr[i] <= "9":
                        i += 1
                else:
                    raise ValueError("invalid number")
            else:
                while i < n and "0" <= expr[i] <= "9":
                    i += 1
                if i < n and expr[i] == ".":
                    i += 1
                    while i < n and "0" <= expr[i] <= "9":
                        i += 1

            tokens.append(("NUM", expr[start:i]))
            continue

        if ("A" <= c <= "Z") or ("a" <= c <= "z") or c == "_":
            start = i
            i += 1

            while i < n:
                d = expr[i]
                if (
                    ("A" <= d <= "Z")
                    or ("a" <= d <= "z")
                    or ("0" <= d <= "9")
                    or d == "_"
                ):
                    i += 1
                else:
                    break

            tokens.append(("NAME", expr[start:i]))
            continue

        if c in "+-*/^":
            tokens.append(("OP", c))
            i += 1
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

        raise ValueError("invalid character")

    return tokens


def _parse_number(text: str) -> Fraction:
    if "." in text:
        whole, frac = text.split(".", 1)

        if whole == "":
            whole = "0"

        if frac:
            denominator = 10 ** len(frac)
            numerator = int(whole) * denominator + int(frac)
        else:
            denominator = 1
            numerator = int(whole)

        return Fraction(numerator, denominator)

    return Fraction(int(text), 1)


class _Parser:
    def __init__(self, tokens: list[tuple[str, str]]) -> None:
        self.tokens = tokens
        self.pos = 0

    def _peek(self) -> tuple[str | None, str | None]:
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return None, None

    def parse(self):
        if not self.tokens:
            raise ValueError("empty expression")

        node = self._parse_add()

        if self.pos != len(self.tokens):
            raise ValueError("unexpected trailing tokens")

        return node

    def _parse_add(self):
        node = self._parse_mul()

        while True:
            kind, value = self._peek()

            if kind == "OP" and value in ("+", "-"):
                self.pos += 1
                right = self._parse_mul()
                node = ("bin", value, node, right)
            else:
                break

        return node

    def _parse_mul(self):
        node = self._parse_unary()

        while True:
            kind, value = self._peek()

            if kind == "OP" and value in ("*", "/"):
                self.pos += 1
                right = self._parse_unary()
                node = ("bin", value, node, right)
            else:
                break

        return node

    def _parse_unary(self):
        kind, value = self._peek()

        if kind == "OP" and value in ("+", "-"):
            self.pos += 1
            operand = self._parse_unary()
            return ("unary", value, operand)

        return self._parse_power()

    def _parse_power(self):
        node = self._parse_primary()

        kind, value = self._peek()

        if kind == "OP" and value == "^":
            self.pos += 1
            exponent = self._parse_unary()
            return ("pow", node, exponent)

        return node

    def _parse_primary(self):
        kind, value = self._peek()

        if kind == "NUM":
            self.pos += 1
            return ("num", _parse_number(value))

        if kind == "NAME":
            self.pos += 1
            name = value

            next_kind, _ = self._peek()

            if next_kind == "LPAREN":
                self.pos += 1

                if self._peek()[0] == "RPAREN":
                    self.pos += 1
                    return ("func", name, [])

                args = [self._parse_add()]

                while True:
                    arg_kind, _ = self._peek()

                    if arg_kind == "COMMA":
                        self.pos += 1
                        args.append(self._parse_add())
                    else:
                        break

                if self._peek()[0] != "RPAREN":
                    raise ValueError("expected closing parenthesis")

                self.pos += 1
                return ("func", name, args)

            return ("name", name)

        if kind == "LPAREN":
            self.pos += 1
            node = self._parse_add()

            if self._peek()[0] != "RPAREN":
                raise ValueError("expected closing parenthesis")

            self.pos += 1
            return node

        raise ValueError("unexpected token")


def _evaluate_node(node, variables: dict | None) -> Fraction:
    kind = node[0]

    if kind == "num":
        return node[1]

    if kind == "name":
        name = node[1]

        if variables is None or name not in variables:
            raise NameError(name)

        value = variables[name]

        if isinstance(value, Fraction):
            return value

        if isinstance(value, int):
            return Fraction(value)

        return Fraction(value)

    if kind == "unary":
        sign = node[1]
        value = _evaluate_node(node[2], variables)
        return value if sign == "+" else -value

    if kind == "bin":
        op = node[1]
        left = _evaluate_node(node[2], variables)
        right = _evaluate_node(node[3], variables)

        if op == "+":
            return left + right

        if op == "-":
            return left - right

        if op == "*":
            return left * right

        if right == 0:
            raise ZeroDivisionError

        return left / right

    if kind == "pow":
        base = _evaluate_node(node[1], variables)
        exponent = _evaluate_node(node[2], variables)

        if exponent.denominator != 1:
            raise ValueError("exponent must be an integer")

        exp = exponent.numerator

        if base == 0 and exp < 0:
            raise ZeroDivisionError

        return base ** exp

    if kind == "func":
        name = node[1]
        arg_nodes = node[2]

        if name == "abs":
            if len(arg_nodes) != 1:
                raise ValueError("abs takes exactly one argument")

            return abs(_evaluate_node(arg_nodes[0], variables))

        if name == "min":
            if len(arg_nodes) < 1:
                raise ValueError("min takes at least one argument")

            return min(_evaluate_node(arg, variables) for arg in arg_nodes)

        if name == "max":
            if len(arg_nodes) < 1:
                raise ValueError("max takes at least one argument")

            return max(_evaluate_node(arg, variables) for arg in arg_nodes)

        raise ValueError("unknown function")

    raise ValueError("invalid expression")


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    tokens = _tokenize(expr)
    parser = _Parser(tokens)
    ast = parser.parse()
    return _evaluate_node(ast, variables)
