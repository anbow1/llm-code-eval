from fractions import Fraction


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    if variables is None:
        variables = {}
    tokens = _tokenize(expr)
    parser = _Parser(tokens, variables)
    result = parser.parse_expr()
    if parser.pos < len(parser.tokens):
        raise ValueError("trailing tokens")
    return result


def _tokenize(expr: str) -> list:
    tokens: list = []
    i = 0
    n = len(expr)
    while i < n:
        c = expr[i]
        if c.isspace():
            i += 1
        elif c in "+-*/^(),":
            tokens.append(c)
            i += 1
        elif c.isdigit() or c == '.':
            start = i
            has_dot = False
            while i < n and (expr[i].isdigit() or expr[i] == '.'):
                if expr[i] == '.':
                    if has_dot:
                        raise ValueError("invalid number")
                    has_dot = True
                i += 1
            num_str = expr[start:i]
            if not any(ch.isdigit() for ch in num_str):
                raise ValueError("invalid number")
            tokens.append(('NUM', _parse_fraction(num_str)))
        elif c.isalpha() or c == '_':
            start = i
            while i < n and (expr[i].isalnum() or expr[i] == '_'):
                i += 1
            tokens.append(('NAME', expr[start:i]))
        else:
            raise ValueError("unknown character")
    return tokens


def _parse_fraction(s: str) -> Fraction:
    if '.' in s:
        int_part, _, dec_part = s.partition('.')
        if not dec_part:
            return Fraction(int(int_part) if int_part else 0)
        whole = int_part if int_part else '0'
        return Fraction(int(whole + dec_part), 10 ** len(dec_part))
    return Fraction(int(s))


class _Parser:
    def __init__(self, tokens: list, variables: dict):
        self.tokens = tokens
        self.variables = variables
        self.pos = 0

    def peek(self):
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return None

    def advance(self):
        tok = self.tokens[self.pos]
        self.pos += 1
        return tok

    def expect(self, val: str):
        tok = self.peek()
        if tok != val:
            raise ValueError("syntax error")
        self.pos += 1

    def parse_expr(self) -> Fraction:
        left = self.parse_term()
        while self.peek() in ('+', '-'):
            op = self.advance()
            right = self.parse_term()
            if op == '+':
                left = left + right
            else:
                left = left - right
        return left

    def parse_term(self) -> Fraction:
        left = self.parse_unary()
        while self.peek() in ('*', '/'):
            op = self.advance()
            right = self.parse_unary()
            if op == '*':
                left = left * right
            else:
                if right == 0:
                    raise ZeroDivisionError()
                left = left / right
        return left

    def parse_unary(self) -> Fraction:
        tok = self.peek()
        if tok == '+':
            self.advance()
            return self.parse_unary()
        if tok == '-':
            self.advance()
            return -self.parse_unary()
        return self.parse_power()

    def parse_power(self) -> Fraction:
        base = self.parse_atom()
        if self.peek() == '^':
            self.advance()
            exp = self.parse_unary()
            if exp.denominator != 1:
                raise ValueError("exponent must be an integer")
            exp_int = int(exp)
            if base == 0 and exp_int < 0:
                raise ZeroDivisionError()
            return base ** exp_int
        return base

    def parse_atom(self) -> Fraction:
        tok = self.peek()
        if tok is None:
            raise ValueError("unexpected end of expression")
        if isinstance(tok, tuple) and tok[0] == 'NUM':
            self.advance()
            return tok[1]
        if isinstance(tok, tuple) and tok[0] == 'NAME':
            name = self.advance()[1]
            if name in ('abs', 'min', 'max'):
                if self.peek() != '(':
                    raise ValueError("function must be followed by '('")
                self.advance()
                args = [self.parse_expr()]
                while self.peek() == ',':
                    self.advance()
                    args.append(self.parse_expr())
                self.expect(')')
                if name == 'abs':
                    if len(args) != 1:
                        raise ValueError("abs() takes exactly 1 argument")
                    return abs(args[0])
                elif name == 'min':
                    if len(args) < 1:
                        raise ValueError("min() requires at least 1 argument")
                    return min(args)
                else:
                    if len(args) < 1:
                        raise ValueError("max() requires at least 1 argument")
                    return max(args)
            else:
                if name not in self.variables:
                    raise NameError(f"unknown variable: {name}")
                val = self.variables[name]
                if isinstance(val, int):
                    return Fraction(val)
                return val
        if tok == '(':
            self.advance()
            result = self.parse_expr()
            self.expect(')')
            return result
        raise ValueError("syntax error")
