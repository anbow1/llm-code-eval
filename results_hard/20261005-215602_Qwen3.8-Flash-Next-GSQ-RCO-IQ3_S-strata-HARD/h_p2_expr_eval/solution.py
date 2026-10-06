from fractions import Fraction
import re

_FUNCTION_NAMES = frozenset({"abs", "min", "max"})
_NUMBER_RE = re.compile(r"[0-9]+(?:\.[0-9]*)?|\.[0-9]+")
_NAME_RE = re.compile(r"[A-Za-z_][A-Za-z0-9_]*")
_WHITESPACE_RE = re.compile(r"[ \t\n\r\f\v]+")
_OPERATORS = frozenset("+-*/^(),")


def _tokenize(expr: str):
    tokens = []
    i = 0
    n = len(expr)

    while i < n:
        m = _WHITESPACE_RE.match(expr, i)
        if m:
            i = m.end()
            continue

        m = _NUMBER_RE.match(expr, i)
        if m:
            tokens.append(("number", m.group()))
            i = m.end()
            continue

        m = _NAME_RE.match(expr, i)
        if m:
            tokens.append(("name", m.group()))
            i = m.end()
            continue

        ch = expr[i]
        if ch in _OPERATORS:
            tokens.append(("op", ch))
            i += 1
            continue

        raise ValueError(f"Invalid character: {ch!r}")

    return tokens


def _decimal_to_fraction(text: str) -> Fraction:
    if "." not in text:
        return Fraction(int(text), 1)

    int_part, frac_part = text.split(".", 1)
    if frac_part:
        numerator = int((int_part or "0") + frac_part)
        denominator = 10 ** len(frac_part)
    else:
        numerator = int(int_part or "0")
        denominator = 1

    return Fraction(numerator, denominator)


def _to_fraction(value) -> Fraction:
    if isinstance(value, Fraction):
        return value
    if isinstance(value, int):
        return Fraction(value, 1)
    raise ValueError("Variable value must be an integer or Fraction")


def _lookup_variable(name: str, variables) -> Fraction:
    try:
        if name not in variables:
            raise NameError(f"Unknown variable: {name}")
    except TypeError:
        raise ValueError("Variables must be a mapping")

    try:
        value = variables[name]
    except KeyError:
        raise NameError(f"Unknown variable: {name}")
    except TypeError:
        raise ValueError("Variables must be a mapping")

    return _to_fraction(value)


def _apply_power(base: Fraction, exponent: Fraction) -> Fraction:
    if exponent.denominator != 1:
        raise ValueError("Exponent must evaluate to an integer")

    n = exponent.numerator

    if n == 0:
        return Fraction(1, 1)

    if n < 0:
        if base == 0:
            raise ZeroDivisionError("0 cannot be raised to a negative power")
        base = Fraction(1, 1) / base
        n = -n

    return base ** n


class _Compiler:
    def __init__(self, tokens, variables):
        self._tokens = tokens
        self._pos = 0
        self._variables = variables
        self._program = []

    def compile(self):
        if not self._tokens:
            raise ValueError("Empty expression")

        self._parse_expression()

        if self._pos != len(self._tokens):
            raise ValueError("Trailing characters after expression")

        return self._program

    def _peek(self):
        if self._pos >= len(self._tokens):
            return None
        return self._tokens[self._pos]

    def _is_op(self, op: str) -> bool:
        tok = self._peek()
        return tok is not None and tok[0] == "op" and tok[1] == op

    def _expect_op(self, op: str):
        if not self._is_op(op):
            raise ValueError(f"Expected {op!r}")
        self._pos += 1

    def _has_variable(self, name: str) -> bool:
        try:
            return name in self._variables
        except TypeError:
            return False

    def _parse_expression(self):
        self._parse_additive()

    def _parse_additive(self):
        self._parse_multiplicative()

        while True:
            tok = self._peek()
            if tok is not None and tok[0] == "op" and tok[1] in "+-":
                self._pos += 1
                self._parse_multiplicative()
                self._program.append(("add" if tok[1] == "+" else "sub",))
            else:
                break

    def _parse_multiplicative(self):
        self._parse_unary()

        while True:
            tok = self._peek()
            if tok is not None and tok[0] == "op" and tok[1] in "*/":
                self._pos += 1
                self._parse_unary()
                self._program.append(("mul" if tok[1] == "*" else "div",))
            else:
                break

    def _parse_unary(self):
        negative = False

        while True:
            tok = self._peek()
            if tok is not None and tok[0] == "op" and tok[1] in "+-":
                if tok[1] == "-":
                    negative = not negative
                self._pos += 1
            else:
                break

        self._parse_power()

        if negative:
            self._program.append(("neg",))

    def _parse_power(self):
        self._parse_atom()

        if self._is_op("^"):
            self._pos += 1
            self._parse_unary()
            self._program.append(("pow",))

    def _parse_atom(self):
        tok = self._peek()
        if tok is None:
            raise ValueError("Unexpected end of expression")

        kind, text = tok

        if kind == "number":
            self._pos += 1
            self._program.append(("number", text))
            return

        if kind == "name":
            self._pos += 1

            if self._is_op("("):
                if text in _FUNCTION_NAMES:
                    self._parse_call(text)
                else:
                    raise ValueError(f"Unknown function: {text}")
                return

            if text in _FUNCTION_NAMES:
                if self._has_variable(text):
                    self._program.append(("variable", text))
                else:
                    raise ValueError(f"Function name used without parentheses: {text}")
                return

            self._program.append(("variable", text))
            return

        if kind == "op" and text == "(":
            self._pos += 1
            self._parse_expression()
            self._expect_op(")")
            return

        raise ValueError(f"Unexpected token: {text!r}")

    def _parse_call(self, name: str):
        self._expect_op("(")
        arg_count = 0

        if not self._is_op(")"):
            while True:
                self._parse_expression()
                arg_count += 1

                if self._is_op(","):
                    self._pos += 1
                    if self._is_op(")"):
                        raise ValueError("Trailing comma in argument list")
                    continue

                break

        self._expect_op(")")

        if name == "abs":
            if arg_count != 1:
                raise ValueError("abs() takes exactly one argument")
        elif name == "min" or name == "max":
            if arg_count < 1:
                raise ValueError(f"{name}() requires at least one argument")
        else:
            raise ValueError(f"Unknown function: {name}")

        self._program.append(("call", name, arg_count))


def _execute(program, variables):
    stack = []

    def pop():
        if not stack:
            raise ValueError("Malformed compiled expression")
        return stack.pop()

    for op in program:
        kind = op[0]

        if kind == "number":
            stack.append(_decimal_to_fraction(op[1]))

        elif kind == "variable":
            stack.append(_lookup_variable(op[1], variables))

        elif kind == "neg":
            stack.append(-pop())

        elif kind == "add":
            right = pop()
            left = pop()
            stack.append(left + right)

        elif kind == "sub":
            right = pop()
            left = pop()
            stack.append(left - right)

        elif kind == "mul":
            right = pop()
            left = pop()
            stack.append(left * right)

        elif kind == "div":
            right = pop()
            left = pop()
            if right == 0:
                raise ZeroDivisionError("Division by zero")
            stack.append(left / right)

        elif kind == "pow":
            exponent = pop()
            base = pop()
            stack.append(_apply_power(base, exponent))

        elif kind == "call":
            _, name, arity = op
            args = [pop() for _ in range(arity)]
            args.reverse()

            if name == "abs":
                if len(args) != 1:
                    raise ValueError("abs() takes exactly one argument")
                stack.append(abs(args[0]))

            elif name == "min":
                if not args:
                    raise ValueError("min() requires at least one argument")
                stack.append(min(args))

            elif name == "max":
                if not args:
                    raise ValueError("max() requires at least one argument")
                stack.append(max(args))

            else:
                raise ValueError(f"Unknown function: {name}")

        else:
            raise ValueError("Internal evaluation error")

    if len(stack) != 1:
        raise ValueError("Internal evaluation error")

    return stack[0]


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    if not isinstance(expr, str):
        raise ValueError("Expression must be a string")

    if variables is None:
        variables = {}

    tokens = _tokenize(expr)
    compiler = _Compiler(tokens, variables)
    program = compiler.compile()
    return _execute(program, variables)
