```python
from fractions import Fraction


class _Parser:
    def __init__(self, tokens, variables):
        self.tokens = tokens
        self.pos = 0
        self.variables = variables

    def peek(self):
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return ("EOF", None)

    def advance(self):
        tok = self.peek()
        self.pos += 1
        return tok

    def expect(self, kind):
        tok = self.peek()
        if tok[0] != kind:
            raise ValueError(f"expected {kind!r}, got {tok[1]!r}")
        return self.advance()

    def parse(self):
        value = self.parse_expr()
        if self.peek()[0] != "EOF":
            raise ValueError(f"unexpected trailing token {self.peek()[1]!r}")
        return value

    def parse_expr(self):
        value = self.parse_unary()
        while self.peek()[0] in ("+", "-"):
            op = self.advance()[0]
            rhs = self.parse_unary()
            if op == "+":
                value = value + rhs
            else:
                value = value - rhs
        return value

    def parse_unary(self):
        if self.peek()[0] in ("+", "-"):
            op = self.advance()[0]
            value = self.parse_unary()
            return value if op == "+" else -value
        return self.parse_power()

    def parse_power(self):
        base = self.parse_atom()
        if self.peek()[0] == "^":
            self.advance()
            exponent = self.parse_unary()  # right-associative, allows unary sign
            if exponent.denominator != 1:
                raise ValueError("exponent must be an integer")
            return base ** int(exponent)
        return base

    def parse_atom(self):
        kind, val = self.peek()
        if kind == "NUM":
            self.advance()
            return val
        if kind == "NAME":
            self.advance()
            if self.peek()[0] == "(":
                self.advance()
                args = [self.parse_expr()]
                while self.peek()[0] == ",":
                    self.advance()
                    args.append(self.parse_expr())
                self.expect(")")
                return self.call(val, args)
            return self.lookup(val)
        if kind == "(":
            self.advance()
            value = self.parse_expr()
            self.expect(")")
            return value
        raise ValueError(f"unexpected token {val!r}")

    def lookup(self, name):
        if self.variables is None or name not in self.variables:
            raise NameError(f"unknown variable {name!r}")
        value = self.variables[name]
        if isinstance(value, Fraction):
            return value
        return Fraction(value)

    def call(self, name, args):
        if name == "abs":
            if len(args) != 1:
                raise ValueError("abs() takes exactly 1 argument")
            return abs(args[0])
        if name in ("min", "max"):
            if len(args) < 1:
                raise ValueError(f"{name}() takes at least 1 argument")
            return min(args) if name == "min" else max(args)
        raise ValueError(f"unknown function {name!r}")


def _tokenize(expr):
    tokens = []
    i = 0
    n = len(expr)
    while i < n:
        c = expr[i]
        if c.isspace():
            i += 1
            continue
        if c.isdigit() or c == ".":
            j = i
            seen_dot = False
            while j < n and (expr[j].isdigit() or (expr[j] == "." and not seen_dot)):
                if expr[j] == ".":
                    seen_dot = True
                j += 1
            text = expr[i:j]
            if not seen_dot or text == ".":
                if j < n and expr[j] == ".":
                    raise ValueError(f"invalid number starting at {expr[i:j+1]!r}")
            if text == ".":
                raise ValueError("invalid number '.'")
            try:
                tokens.append(("NUM", Fraction(text)))
            except (ValueError, ZeroDivisionError):
                raise ValueError(f"invalid number {text!r}") from None
            i = j
            continue
        if c.isalpha() or c == "_":
            j = i
            while j < n and (expr[j].isalnum() or expr[j] == "_"):
                j += 1
            tokens.append(("NAME", expr[i:j]))
            i = j
            continue
        if c in "+-*/^(),)":
            tokens.append((c, c))
            i += 1
            continue
        raise ValueError(f"unknown character {c!r}")
    return tokens


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    if not isinstance(expr, str):
        raise ValueError("expression must be a string")
    tokens = _tokenize(expr)
    return _Parser(tokens, variables).parse()
```