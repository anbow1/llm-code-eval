```python
import fractions
from fractions import Fraction


def _tokenize(expr: str) -> list[tuple[str, str]]:
    tokens: list[tuple[str, str]] = []
    i = 0
    n = len(expr)
    while i < n:
        ch = expr[i]
        if ch.isspace():
            i += 1
        elif ch.isdigit() or ch == '.':
            start = i
            has_dot = False
            has_digit = False
            while i < n and (expr[i].isdigit() or (expr[i] == '.' and not has_dot)):
                if expr[i] == '.':
                    has_dot = True
                else:
                    has_digit = True
                i += 1
            num_str = expr[start:i]
            if not has_digit:
                raise ValueError(f"Invalid number: '{num_str}'")
            tokens.append(('NUM', num_str))
        elif ch.isalpha() or ch == '_':
            start = i
            while i < n and (expr[i].isalnum() or expr[i] == '_'):
                i += 1
            tokens.append(('ID', expr[start:i]))
        elif ch in '+-*/^(),':
            tokens.append(('OP', ch))
            i += 1
        else:
            raise ValueError(f"Unknown character: '{ch}'")
    return tokens


class _Parser:
    def __init__(self, tokens: list[tuple[str, str]], variables: dict | None):
        self.tokens = tokens
        self.pos = 0
        self.variables = variables or {}

    def _peek(self) -> tuple[str, str] | None:
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return None

    def _consume(self, expected_type: str | None = None, expected_val: str | None = None) -> tuple[str, str]:
        tok = self._peek()
        if tok is None:
            raise ValueError("Unexpected end of expression")
        if expected_type is not None and tok[0] != expected_type:
            raise ValueError(f"Expected {expected_type}, got {tok}")
        if expected_val is not None and tok[1] != expected_val:
            raise ValueError(f"Expected '{expected_val}', got '{tok[1]}'")
        self.pos += 1
        return tok

    def _expect_op(self, val: str) -> tuple[str, str]:
        return self._consume('OP', val)

    def parse(self) -> Fraction:
        result = self._parse_expr()
        if self.pos < len(self.tokens):
            raise ValueError(f"Unexpected trailing token: {self.tokens[self.pos]}")
        return result

    def _parse_expr(self) -> Fraction:
        result = self._parse_term()
        while True:
            tok = self._peek()
            if tok is not None and tok[0] == 'OP' and tok[1] in ('+', '-'):
                op = self._consume()[1]
                right = self._parse_term()
                if op == '+':
                    result = result + right
                else:
                    result = result - right
            else:
                break
        return result

    def _parse_term(self) -> Fraction:
        result = self._parse_unary()
        while True:
            tok = self._peek()
            if tok is not None and tok[0] == 'OP' and tok[1] in ('*', '/'):
                op = self._consume()[1]
                right = self._parse_unary()
                if op == '*':
                    result = result * right
                else:
                    result = result / right
            else:
                break
        return result

    def _parse_unary(self) -> Fraction:
        tok = self._peek()
        if tok is not None and tok[0] == 'OP' and tok[1] in ('+', '-'):
            op = self._consume()[1]
            operand = self._parse_unary()
            if op == '-':
                return -operand
            return operand
        return self._parse_power()

    def _parse_power(self) -> Fraction:
        base = self._parse_primary()
        tok = self._peek()
        if tok is not None and tok[0] == 'OP' and tok[1] == '^':
            self._consume()
            exp = self._parse_unary()
            if exp.denominator != 1:
                raise ValueError("Exponent must be an integer")
            exp_int = exp.numerator
            if base == 0 and exp_int < 0:
                raise ZeroDivisionError("0 cannot be raised to a negative power")
            return base ** exp_int
        return base

    def _parse_primary(self) -> Fraction:
        tok = self._peek()
        if tok is None:
            raise ValueError("Unexpected end of expression")
        if tok[0] == 'NUM':
            self._consume()
            return Fraction(tok[1])
        if tok[0] == 'ID':
            name = tok[1]
            self._consume()
            if name == 'abs':
                return self._call_abs()
            elif name == 'min':
                return self._call_minmax(min)
            elif name == 'max':
                return self._call_minmax(max)
            else:
                if name not in self.variables:
                    raise NameError(f"Unknown variable: '{name}'")
                val = self.variables[name]
                if isinstance(val, int):
                    return Fraction(val)
                return val
        if tok[0] == 'OP' and tok[1] == '(':
            self._consume()
            result = self._parse_expr()
            self._expect_op(')')
            return result
        raise ValueError(f"Unexpected token: '{tok[1]}'")

    def _call_abs(self) -> Fraction:
        self._expect_op('(')
        arg = self._parse_expr()
        self._expect_op(',')  # wrong: should check ) not ,
        # Actually let me redo this properly
        # Remove the line above... I'll restructure.
        raise ValueError  # placeholder

    def _call_minmax(self, func) -> Fraction:
        self._expect_op('(')
        args: list[Fraction] = []
        args.append(self._parse_expr())
        while True:
            tok = self._peek()
            if tok is not None and tok[0] == 'OP' and tok[1] == ',':
                self._consume()
                args.append(self._parse_expr())
            else:
                break
        self._expect_op(')')
        return func(args)

    def _call_abs(self) -> Fraction:
        self._expect_op('(')
        arg = self._parse_expr()
        tok = self._peek()
        if tok is not None and tok[0] == 'OP' and tok[1] == ',':
            raise ValueError("abs() takes exactly 1 argument")
        self._expect_op(')')
        return abs(arg)


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    tokens = _tokenize(expr)
    if not tokens:
        raise ValueError("Empty input")
    parser = _Parser(tokens, variables)
    return parser.parse()
```