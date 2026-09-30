```python
import fractions
from fractions import Fraction


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    tokens = _tokenize(expr)
    if not tokens:
        raise ValueError("empty expression")
    parser = _Parser(tokens, variables if variables is not None else {})
    result = parser.parse_expr()
    if parser.peek() is not None:
        raise ValueError("trailing tokens")
    return result


def _tokenize(expr):
    tokens = []
    i = 0
    n = len(expr)
    while i < n:
        c = expr[i]
        if c in ' \t\n\r':
            i += 1
        elif c in '+-*/^(),':
            tokens.append(('op', c))
            i += 1
        elif c.isdigit() or c == '.':
            start = i
            if c == '.':
                i += 1
                if i >= n or not expr[i].isdigit():
                    raise ValueError("invalid number at position %d" % start)
                while i < n and expr[i].isdigit():
                    i += 1
            else:
                while i < n and expr[i].isdigit():
                    i += 1
                if i < n and expr[i] == '.':
                    i += 1
                    while i < n and expr[i].isdigit():
                        i += 1
            tokens.append(('num', _parse_number(expr[start:i])))
        elif c.isalpha() or c == '_':
            start = i
            while i < n and (expr[i].isalnum() or expr[i] == '_'):
                i += 1
            tokens.append(('name', expr[start:i]))
        else:
            raise ValueError("unknown character %r at position %d" % (c, i))
    return tokens


def _parse_number(s):
    if '.' in s:
        parts = s.split('.')
        if len(parts) != 2:
            raise ValueError("invalid number %r" % s)
        int_part = parts[0] if parts[0] else '0'
        frac_part = parts[1]
        if frac_part:
            return Fraction(int(int_part + frac_part), 10 ** len(frac_part))
        return Fraction(int(int_part))
    return Fraction(int(s))


class _Parser:
    _FUNCS = frozenset(('abs', 'min', 'max'))

    def __init__(self, tokens, variables):
        self.tokens = tokens
        self.pos = 0
        self.variables = variables

    def peek(self):
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return None

    def peek_op(self, op):
        tok = self.peek()
        return tok is not None and tok[0] == 'op' and tok[1] == op

    def consume_op(self, op):
        if self.peek_op(op):
            self.pos += 1
            return True
        return False

    # expr = additive
    def parse_expr(self):
        return self.parse_additive()

    # additive = term (('+' | '-') term)*
    def parse_additive(self):
        result = self.parse_term()
        while True:
            if self.peek_op('+'):
                self.pos += 1
                result += self.parse_term()
            elif self.peek_op('-'):
                self.pos += 1
                result -= self.parse_term()
            else:
                break
        return result

    # term = ('+' | '-')* term_core
    def parse_term(self):
        neg = 0
        while True:
            if self.peek_op('-'):
                self.pos += 1
                neg += 1
            elif self.peek_op('+'):
                self.pos += 1
            else:
                break
        core = self.parse_term_core()
        return -core if neg & 1 else core

    # term_core = power (('*' | '/') power)*
    def parse_term_core(self):
        result = self.parse_power()
        while True:
            if self.peek_op('*'):
                self.pos += 1
                result *= self.parse_power()
            elif self.peek_op('/'):
                self.pos += 1
                result /= self.parse_power()
            else:
                break
        return result

    # power = atom ('^' power_exp)?   -- right-associative via power_exp -> power
    def parse_power(self):
        base = self.parse_atom()
        if self.peek_op('^'):
            self.pos += 1
            exp = self.parse_power_exp()
            if exp.denominator != 1:
                raise ValueError("exponent must be an integer")
            return base ** exp.numerator
        return base

    # power_exp = ('+' | '-')* power   -- unary signs allowed right after ^
    def parse_power_exp(self):
        neg = 0
        while True:
            if self.peek_op('-'):
                self.pos += 1
                neg += 1
            elif self.peek_op('+'):
                self.pos += 1
            else:
                break
        exp = self.parse_power()
        return -exp if neg & 1 else exp

    # atom = NUMBER | '(' expr ')' | NAME | FUNC '(' args ')'
    def parse_atom(self):
        tok = self.peek()
        if tok is None:
            raise ValueError("unexpected end of expression")
        if tok[0] == 'num':
            self.pos += 1
            return tok[1]
        if tok[0] == 'op' and tok[1] == '(':
            self.pos += 1
            result = self.parse_expr()
            if not self.consume_op(')'):
                raise ValueError("expected )")
            return result
        if tok[0] == 'name':
            self.pos += 1
            name = tok[1]
            if name in self._FUNCS:
                if not self.consume_op('('):
                    raise ValueError("function %r expects (")
                args = self.parse_args(name)
                if name == 'abs':
                    if len(args) != 1:
                        raise ValueError("abs takes exactly 1 argument")
                    return abs(args[0])
                elif name == 'min':
                    if len(args) < 1:
                        raise ValueError("min requires at least 1 argument")
                    return min(args)
                else:
                    if len(args) < 1:
                        raise ValueError("max requires at least 1 argument")
                    return max(args)
            else:
                if name in self.variables:
                    val = self.variables[name]
                    if isinstance(val, Fraction):
                        return val
                    if isinstance(val, int):
                        return Fraction(val)
                    raise ValueError("variable %r has unsupported type" % name)
                raise NameError("unknown variable %r" % name)
        raise ValueError("unexpected token")

    def parse_args(self, name):
        args = []
        if self.peek_op(')'):
            self.pos += 1
            return args
        args.append(self.parse_expr())
        while True:
            if self.consume_op(','):
                args.append(self.parse_expr())
            elif self.consume_op(')'):
                break
            else:
                raise ValueError("expected , or ) in %s()" % name)
        return args
```