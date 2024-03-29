(function () {
    var JSParsingTools = {};

    // ---------------- Acorn -------------------
    var acornExports = {};

    (function (exports) {
        // Acorn is a tiny, fast JavaScript parser written in JavaScript.
//
// Acorn was written by Marijn Haverbeke and released under an MIT
// license. The Unicode regexps (for identifiers and whitespace) were
// taken from [Esprima](http://esprima.org) by Ariya Hidayat.
//
// Git repositories for Acorn are available at
//
//     http://marijnhaverbeke.nl/git/acorn
//     https://github.com/marijnh/acorn.git
//
// Please use the [github bug tracker][ghbt] to report issues.
//
// [ghbt]: https://github.com/marijnh/acorn/issues
//
// This file defines the main parser interface. The library also comes
// with a [error-tolerant parser][dammit] and an
// [abstract syntax tree walker][walk], defined in other files.
//
// [dammit]: acorn_loose.js
// [walk]: util/walk.js

        (function (root, mod) {
            if (typeof exports == "object" && typeof module == "object") return mod(exports); // CommonJS
            if (typeof define == "function" && define.amd) return define(["exports"], mod); // AMD
            mod(root.acorn || (root.acorn = {})); // Plain browser env
        })(this, function (exports) {
            "use strict";

            exports.version = "0.4.1";

            // The main exported interface (under `self.acorn` when in the
            // browser) is a `parse` function that takes a code string and
            // returns an abstract syntax tree as specified by [Mozilla parser
            // API][api], with the caveat that the SpiderMonkey-specific syntax
            // (`let`, `yield`, inline XML, etc) is not recognized.
            //
            // [api]: https://developer.mozilla.org/en-US/docs/SpiderMonkey/Parser_API

            var options, input, inputLen, sourceFile;

            exports.parse = function (inpt, opts) {
                input = String(inpt);
                inputLen = input.length;
                setOptions(opts);
                initTokenState();
                return parseTopLevel(options.program);
            };

            // A second optional argument can be given to further configure
            // the parser process. These options are recognized:

            var defaultOptions = exports.defaultOptions = {
                // `ecmaVersion` indicates the ECMAScript version to parse. Must
                // be either 3 or 5. This
                // influences support for strict mode, the set of reserved words, and
                // support for getters and setter.
                ecmaVersion: 5,
                // Turn on `strictSemicolons` to prevent the parser from doing
                // automatic semicolon insertion.
                strictSemicolons: false,
                // When `allowTrailingCommas` is false, the parser will not allow
                // trailing commas in array and object literals.
                allowTrailingCommas: true,
                // By default, reserved words are not enforced. Enable
                // `forbidReserved` to enforce them.
                forbidReserved: false,
                // When `locations` is on, `loc` properties holding objects with
                // `start` and `end` properties in `{line, column}` form (with
                // line being 1-based and column 0-based) will be attached to the
                // nodes.
                locations: false,
                // A function can be passed as `onComment` option, which will
                // cause Acorn to call that function with `(block, text, start,
                // end)` parameters whenever a comment is skipped. `block` is a
                // boolean indicating whether this is a block (`/* */`) comment,
                // `text` is the content of the comment, and `start` and `end` are
                // character offsets that denote the start and end of the comment.
                // When the `locations` option is on, two more parameters are
                // passed, the full `{line, column}` locations of the start and
                // end of the comments.
                onComment: null,
                // Nodes have their start and end characters offsets recorded in
                // `start` and `end` properties (directly on the node, rather than
                // the `loc` object, which holds line/column data. To also add a
                // [semi-standardized][range] `range` property holding a `[start,
                // end]` array with the same numbers, set the `ranges` option to
                // `true`.
                //
                // [range]: https://bugzilla.mozilla.org/show_bug.cgi?id=745678
                ranges: false,
                // It is possible to parse multiple files into a single AST by
                // passing the tree produced by parsing the first file as
                // `program` option in subsequent parses. This will add the
                // toplevel forms of the parsed file to the `Program` (top) node
                // of an existing parse tree.
                program: null,
                // When `location` is on, you can pass this to record the source
                // file in every node's `loc` object.
                sourceFile: null,
                // This value, if given, is stored in every node, whether
                // `location` is on or off.
                directSourceFile: null
            };

            function setOptions(opts) {
                options = opts || {};
                for (var opt in defaultOptions) if (!Object.prototype.hasOwnProperty.call(options, opt))
                    options[opt] = defaultOptions[opt];
                sourceFile = options.sourceFile || null;
            }

            // The `getLineInfo` function is mostly useful when the
            // `locations` option is off (for performance reasons) and you
            // want to find the line/column position for a given character
            // offset. `input` should be the code string that the offset refers
            // into.

            var getLineInfo = exports.getLineInfo = function (input, offset) {
                for (var line = 1, cur = 0; ;) {
                    lineBreak.lastIndex = cur;
                    var match = lineBreak.exec(input);
                    if (match && match.index < offset) {
                        ++line;
                        cur = match.index + match[0].length;
                    } else break;
                }
                return {line: line, column: offset - cur};
            };

            // Acorn is organized as a tokenizer and a recursive-descent parser.
            // The `tokenize` export provides an interface to the tokenizer.
            // Because the tokenizer is optimized for being efficiently used by
            // the Acorn parser itself, this interface is somewhat crude and not
            // very modular. Performing another parse or call to `tokenize` will
            // reset the internal state, and invalidate existing tokenizers.

            exports.tokenize = function (inpt, opts) {
                input = String(inpt);
                inputLen = input.length;
                setOptions(opts);
                initTokenState();

                var t = {};

                function getToken(forceRegexp) {
                    readToken(forceRegexp);
                    t.start = tokStart;
                    t.end = tokEnd;
                    t.startLoc = tokStartLoc;
                    t.endLoc = tokEndLoc;
                    t.type = tokType;
                    t.value = tokVal;
                    return t;
                }

                getToken.jumpTo = function (pos, reAllowed) {
                    tokPos = pos;
                    if (options.locations) {
                        tokCurLine = 1;
                        tokLineStart = lineBreak.lastIndex = 0;
                        var match;
                        while ((match = lineBreak.exec(input)) && match.index < pos) {
                            ++tokCurLine;
                            tokLineStart = match.index + match[0].length;
                        }
                    }
                    tokRegexpAllowed = reAllowed;
                    skipSpace();
                };
                return getToken;
            };

            // State is kept in (closure-)global variables. We already saw the
            // `options`, `input`, and `inputLen` variables above.

            // The current position of the tokenizer in the input.

            var tokPos;

            // The start and end offsets of the current token.

            var tokStart, tokEnd;

            // When `options.locations` is true, these hold objects
            // containing the tokens start and end line/column pairs.

            var tokStartLoc, tokEndLoc;

            // The type and value of the current token. Token types are objects,
            // named by variables against which they can be compared, and
            // holding properties that describe them (indicating, for example,
            // the precedence of an infix operator, and the original name of a
            // keyword token). The kind of value that's held in `tokVal` depends
            // on the type of the token. For literals, it is the literal value,
            // for operators, the operator name, and so on.

            var tokType, tokVal;

            // Interal state for the tokenizer. To distinguish between division
            // operators and regular expressions, it remembers whether the last
            // token was one that is allowed to be followed by an expression.
            // (If it is, a slash is probably a regexp, if it isn't it's a
            // division operator. See the `parseStatement` function for a
            // caveat.)

            var tokRegexpAllowed;

            // When `options.locations` is true, these are used to keep
            // track of the current line, and know when a new line has been
            // entered.

            var tokCurLine, tokLineStart;

            // These store the position of the previous token, which is useful
            // when finishing a node and assigning its `end` position.

            var lastStart, lastEnd, lastEndLoc;

            // This is the parser's state. `inFunction` is used to reject
            // `return` statements outside of functions, `labels` to verify that
            // `break` and `continue` have somewhere to jump to, and `strict`
            // indicates whether strict mode is on.

            var inFunction, labels, strict;

            // This function is used to raise exceptions on parse errors. It
            // takes an offset integer (into the current `input`) to indicate
            // the location of the error, attaches the position to the end
            // of the error message, and then raises a `SyntaxError` with that
            // message.

            function raise(pos, message) {
                var loc = getLineInfo(input, pos);
                message += " (" + loc.line + ":" + loc.column + ")";
                var err = new SyntaxError(message);
                err.pos = pos;
                err.loc = loc;
                err.raisedAt = tokPos;
                throw err;
            }

            // Reused empty array added for node fields that are always empty.

            var empty = [];

            // ## Token types

            // The assignment of fine-grained, information-carrying type objects
            // allows the tokenizer to store the information it has about a
            // token in a way that is very cheap for the parser to look up.

            // All token type variables start with an underscore, to make them
            // easy to recognize.

            // These are the general types. The `type` property is only used to
            // make them recognizeable when debugging.

            var _num = {type: "num"}, _regexp = {type: "regexp"}, _string = {type: "string"};
            var _name = {type: "name"}, _eof = {type: "eof"};

            // Keyword tokens. The `keyword` property (also used in keyword-like
            // operators) indicates that the token originated from an
            // identifier-like word, which is used when parsing property names.
            //
            // The `beforeExpr` property is used to disambiguate between regular
            // expressions and divisions. It is set on all token types that can
            // be followed by an expression (thus, a slash after them would be a
            // regular expression).
            //
            // `isLoop` marks a keyword as starting a loop, which is important
            // to know when parsing a label, in order to allow or disallow
            // continue jumps to that label.

            var _break = {keyword: "break"}, _case = {keyword: "case", beforeExpr: true}, _catch = {keyword: "catch"};
            var _continue = {keyword: "continue"}, _debugger = {keyword: "debugger"}, _default = {keyword: "default"};
            var _do = {keyword: "do", isLoop: true}, _else = {keyword: "else", beforeExpr: true};
            var _finally = {keyword: "finally"}, _for = {
                keyword: "for",
                isLoop: true
            }, _function = {keyword: "function"};
            var _if = {keyword: "if"}, _return = {keyword: "return", beforeExpr: true}, _switch = {keyword: "switch"};
            var _throw = {keyword: "throw", beforeExpr: true}, _try = {keyword: "try"}, _var = {keyword: "var"};
            var _while = {keyword: "while", isLoop: true}, _with = {keyword: "with"}, _new = {
                keyword: "new",
                beforeExpr: true
            };
            var _this = {keyword: "this"};

            // The keywords that denote values.

            var _null = {keyword: "null", atomValue: null}, _true = {keyword: "true", atomValue: true};
            var _false = {keyword: "false", atomValue: false};

            // Some keywords are treated as regular operators. `in` sometimes
            // (when parsing `for`) needs to be tested against specifically, so
            // we assign a variable name to it for quick comparing.

            var _in = {keyword: "in", binop: 7, beforeExpr: true};

            // Map keyword names to token types.

            var keywordTypes = {
                "break": _break, "case": _case, "catch": _catch,
                "continue": _continue, "debugger": _debugger, "default": _default,
                "do": _do, "else": _else, "finally": _finally, "for": _for,
                "function": _function, "if": _if, "return": _return, "switch": _switch,
                "throw": _throw, "try": _try, "var": _var, "while": _while, "with": _with,
                "null": _null, "true": _true, "false": _false, "new": _new, "in": _in,
                "instanceof": {keyword: "instanceof", binop: 7, beforeExpr: true}, "this": _this,
                "typeof": {keyword: "typeof", prefix: true, beforeExpr: true},
                "void": {keyword: "void", prefix: true, beforeExpr: true},
                "delete": {keyword: "delete", prefix: true, beforeExpr: true}
            };

            // Punctuation token types. Again, the `type` property is purely for debugging.

            var _bracketL = {type: "[", beforeExpr: true}, _bracketR = {type: "]"}, _braceL = {
                type: "{",
                beforeExpr: true
            };
            var _braceR = {type: "}"}, _parenL = {type: "(", beforeExpr: true}, _parenR = {type: ")"};
            var _comma = {type: ",", beforeExpr: true}, _semi = {type: ";", beforeExpr: true};
            var _colon = {type: ":", beforeExpr: true}, _dot = {type: "."}, _question = {type: "?", beforeExpr: true};

            // Operators. These carry several kinds of properties to help the
            // parser use them properly (the presence of these properties is
            // what categorizes them as operators).
            //
            // `binop`, when present, specifies that this operator is a binary
            // operator, and will refer to its precedence.
            //
            // `prefix` and `postfix` mark the operator as a prefix or postfix
            // unary operator. `isUpdate` specifies that the node produced by
            // the operator should be of type UpdateExpression rather than
            // simply UnaryExpression (`++` and `--`).
            //
            // `isAssign` marks all of `=`, `+=`, `-=` etcetera, which act as
            // binary operators with a very low precedence, that should result
            // in AssignmentExpression nodes.

            var _slash = {binop: 10, beforeExpr: true}, _eq = {isAssign: true, beforeExpr: true};
            var _assign = {isAssign: true, beforeExpr: true};
            var _incDec = {postfix: true, prefix: true, isUpdate: true}, _prefix = {prefix: true, beforeExpr: true};
            var _logicalOR = {binop: 1, beforeExpr: true};
            var _logicalAND = {binop: 2, beforeExpr: true};
            var _bitwiseOR = {binop: 3, beforeExpr: true};
            var _bitwiseXOR = {binop: 4, beforeExpr: true};
            var _bitwiseAND = {binop: 5, beforeExpr: true};
            var _equality = {binop: 6, beforeExpr: true};
            var _relational = {binop: 7, beforeExpr: true};
            var _bitShift = {binop: 8, beforeExpr: true};
            var _plusMin = {binop: 9, prefix: true, beforeExpr: true};
            var _multiplyModulo = {binop: 10, beforeExpr: true};

            // Provide access to the token types for external users of the
            // tokenizer.

            exports.tokTypes = {
                bracketL: _bracketL, bracketR: _bracketR, braceL: _braceL, braceR: _braceR,
                parenL: _parenL, parenR: _parenR, comma: _comma, semi: _semi, colon: _colon,
                dot: _dot, question: _question, slash: _slash, eq: _eq, name: _name, eof: _eof,
                num: _num, regexp: _regexp, string: _string
            };
            for (var kw in keywordTypes) exports.tokTypes["_" + kw] = keywordTypes[kw];

            // This is a trick taken from Esprima. It turns out that, on
            // non-Chrome browsers, to check whether a string is in a set, a
            // predicate containing a big ugly `switch` statement is faster than
            // a regular expression, and on Chrome the two are about on par.
            // This function uses `eval` (non-lexical) to produce such a
            // predicate from a space-separated string of words.
            //
            // It starts by sorting the words by length.

            function makePredicate(words) {
                words = words.split(" ");
                var f = "", cats = [];
                out: for (var i = 0; i < words.length; ++i) {
                    for (var j = 0; j < cats.length; ++j)
                        if (cats[j][0].length == words[i].length) {
                            cats[j].push(words[i]);
                            continue out;
                        }
                    cats.push([words[i]]);
                }
                function compareTo(arr) {
                    if (arr.length == 1) return f += "return str === " + JSON.stringify(arr[0]) + ";";
                    f += "switch(str){";
                    for (var i = 0; i < arr.length; ++i) f += "case " + JSON.stringify(arr[i]) + ":";
                    f += "return true}return false;";
                }

                // When there are more than three length categories, an outer
                // switch first dispatches on the lengths, to save on comparisons.

                if (cats.length > 3) {
                    cats.sort(function (a, b) {
                        return b.length - a.length;
                    });
                    f += "switch(str.length){";
                    for (var i = 0; i < cats.length; ++i) {
                        var cat = cats[i];
                        f += "case " + cat[0].length + ":";
                        compareTo(cat);
                    }
                    f += "}";

                    // Otherwise, simply generate a flat `switch` statement.

                } else {
                    compareTo(words);
                }
                return new Function("str", f);
            }

            // The ECMAScript 3 reserved word list.

            var isReservedWord3 = makePredicate("abstract boolean byte char class double enum export extends final float goto implements import int interface long native package private protected public short static super synchronized throws transient volatile");

            // ECMAScript 5 reserved words.

            var isReservedWord5 = makePredicate("class enum extends super const export import");

            // The additional reserved words in strict mode.

            var isStrictReservedWord = makePredicate("implements interface let package private protected public static yield");

            // The forbidden variable names in strict mode.

            var isStrictBadIdWord = makePredicate("eval arguments");

            // And the keywords.

            var isKeyword = makePredicate("break case catch continue debugger default do else finally for function if return switch throw try var while with null true false instanceof typeof void delete new in this");

            // ## Character categories

            // Big ugly regular expressions that match characters in the
            // whitespace, identifier, and identifier-start categories. These
            // are only applied when a character is found to actually have a
            // code point above 128.

            var nonASCIIwhitespace = /[\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff]/;
            var nonASCIIidentifierStartChars = "\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u08a0\u08a2-\u08ac\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097f\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d\u0c58\u0c59\u0c60\u0c61\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d60\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1877\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191c\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19c1-\u19c7\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2e2f\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua697\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa80-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc";
            var nonASCIIidentifierChars = "\u0300-\u036f\u0483-\u0487\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u0620-\u0649\u0672-\u06d3\u06e7-\u06e8\u06fb-\u06fc\u0730-\u074a\u0800-\u0814\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0840-\u0857\u08e4-\u08fe\u0900-\u0903\u093a-\u093c\u093e-\u094f\u0951-\u0957\u0962-\u0963\u0966-\u096f\u0981-\u0983\u09bc\u09be-\u09c4\u09c7\u09c8\u09d7\u09df-\u09e0\u0a01-\u0a03\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a66-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0abe-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ae2-\u0ae3\u0ae6-\u0aef\u0b01-\u0b03\u0b3c\u0b3e-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b5f-\u0b60\u0b66-\u0b6f\u0b82\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd7\u0be6-\u0bef\u0c01-\u0c03\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62-\u0c63\u0c66-\u0c6f\u0c82\u0c83\u0cbc\u0cbe-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0ce2-\u0ce3\u0ce6-\u0cef\u0d02\u0d03\u0d46-\u0d48\u0d57\u0d62-\u0d63\u0d66-\u0d6f\u0d82\u0d83\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0df2\u0df3\u0e34-\u0e3a\u0e40-\u0e45\u0e50-\u0e59\u0eb4-\u0eb9\u0ec8-\u0ecd\u0ed0-\u0ed9\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f41-\u0f47\u0f71-\u0f84\u0f86-\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u1000-\u1029\u1040-\u1049\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f-\u109d\u135d-\u135f\u170e-\u1710\u1720-\u1730\u1740-\u1750\u1772\u1773\u1780-\u17b2\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u1920-\u192b\u1930-\u193b\u1951-\u196d\u19b0-\u19c0\u19c8-\u19c9\u19d0-\u19d9\u1a00-\u1a15\u1a20-\u1a53\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1b46-\u1b4b\u1b50-\u1b59\u1b6b-\u1b73\u1bb0-\u1bb9\u1be6-\u1bf3\u1c00-\u1c22\u1c40-\u1c49\u1c5b-\u1c7d\u1cd0-\u1cd2\u1d00-\u1dbe\u1e01-\u1f15\u200c\u200d\u203f\u2040\u2054\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2d81-\u2d96\u2de0-\u2dff\u3021-\u3028\u3099\u309a\ua640-\ua66d\ua674-\ua67d\ua69f\ua6f0-\ua6f1\ua7f8-\ua800\ua806\ua80b\ua823-\ua827\ua880-\ua881\ua8b4-\ua8c4\ua8d0-\ua8d9\ua8f3-\ua8f7\ua900-\ua909\ua926-\ua92d\ua930-\ua945\ua980-\ua983\ua9b3-\ua9c0\uaa00-\uaa27\uaa40-\uaa41\uaa4c-\uaa4d\uaa50-\uaa59\uaa7b\uaae0-\uaae9\uaaf2-\uaaf3\uabc0-\uabe1\uabec\uabed\uabf0-\uabf9\ufb20-\ufb28\ufe00-\ufe0f\ufe20-\ufe26\ufe33\ufe34\ufe4d-\ufe4f\uff10-\uff19\uff3f";
            var nonASCIIidentifierStart = new RegExp("[" + nonASCIIidentifierStartChars + "]");
            var nonASCIIidentifier = new RegExp("[" + nonASCIIidentifierStartChars + nonASCIIidentifierChars + "]");

            // Whether a single character denotes a newline.

            var newline = /[\n\r\u2028\u2029]/;

            // Matches a whole line break (where CRLF is considered a single
            // line break). Used to count lines.

            var lineBreak = /\r\n|[\n\r\u2028\u2029]/g;

            // Test whether a given character code starts an identifier.

            var isIdentifierStart = exports.isIdentifierStart = function (code) {
                if (code < 65) return code === 36;
                if (code < 91) return true;
                if (code < 97) return code === 95;
                if (code < 123)return true;
                return code >= 0xaa && nonASCIIidentifierStart.test(String.fromCharCode(code));
            };

            // Test whether a given character is part of an identifier.

            var isIdentifierChar = exports.isIdentifierChar = function (code) {
                if (code < 48) return code === 36;
                if (code < 58) return true;
                if (code < 65) return false;
                if (code < 91) return true;
                if (code < 97) return code === 95;
                if (code < 123)return true;
                return code >= 0xaa && nonASCIIidentifier.test(String.fromCharCode(code));
            };

            // ## Tokenizer

            // These are used when `options.locations` is on, for the
            // `tokStartLoc` and `tokEndLoc` properties.

            function line_loc_t() {
                this.line = tokCurLine;
                this.column = tokPos - tokLineStart;
            }

            // Reset the token state. Used at the start of a parse.

            function initTokenState() {
                tokCurLine = 1;
                tokPos = tokLineStart = 0;
                tokRegexpAllowed = true;
                skipSpace();
            }

            // Called at the end of every token. Sets `tokEnd`, `tokVal`, and
            // `tokRegexpAllowed`, and skips the space after the token, so that
            // the next one's `tokStart` will point at the right position.

            function finishToken(type, val) {
                tokEnd = tokPos;
                if (options.locations) tokEndLoc = new line_loc_t;
                tokType = type;
                skipSpace();
                tokVal = val;
                tokRegexpAllowed = type.beforeExpr;
            }

            function skipBlockComment() {
                var startLoc = options.onComment && options.locations && new line_loc_t;
                var start = tokPos, end = input.indexOf("*/", tokPos += 2);
                if (end === -1) raise(tokPos - 2, "Unterminated comment");
                tokPos = end + 2;
                if (options.locations) {
                    lineBreak.lastIndex = start;
                    var match;
                    while ((match = lineBreak.exec(input)) && match.index < tokPos) {
                        ++tokCurLine;
                        tokLineStart = match.index + match[0].length;
                    }
                }
                if (options.onComment)
                    options.onComment(true, input.slice(start + 2, end), start, tokPos,
                        startLoc, options.locations && new line_loc_t);
            }

            function skipLineComment() {
                var start = tokPos;
                var startLoc = options.onComment && options.locations && new line_loc_t;
                var ch = input.charCodeAt(tokPos += 2);
                while (tokPos < inputLen && ch !== 10 && ch !== 13 && ch !== 8232 && ch !== 8233) {
                    ++tokPos;
                    ch = input.charCodeAt(tokPos);
                }
                if (options.onComment)
                    options.onComment(false, input.slice(start + 2, tokPos), start, tokPos,
                        startLoc, options.locations && new line_loc_t);
            }

            // Called at the start of the parse and after every token. Skips
            // whitespace and comments, and.

            function skipSpace() {
                while (tokPos < inputLen) {
                    var ch = input.charCodeAt(tokPos);
                    if (ch === 32) { // ' '
                        ++tokPos;
                    } else if (ch === 13) {
                        ++tokPos;
                        var next = input.charCodeAt(tokPos);
                        if (next === 10) {
                            ++tokPos;
                        }
                        if (options.locations) {
                            ++tokCurLine;
                            tokLineStart = tokPos;
                        }
                    } else if (ch === 10 || ch === 8232 || ch === 8233) {
                        ++tokPos;
                        if (options.locations) {
                            ++tokCurLine;
                            tokLineStart = tokPos;
                        }
                    } else if (ch > 8 && ch < 14) {
                        ++tokPos;
                    } else if (ch === 47) { // '/'
                        var next = input.charCodeAt(tokPos + 1);
                        if (next === 42) { // '*'
                            skipBlockComment();
                        } else if (next === 47) { // '/'
                            skipLineComment();
                        } else break;
                    } else if (ch === 160) { // '\xa0'
                        ++tokPos;
                    } else if (ch >= 5760 && nonASCIIwhitespace.test(String.fromCharCode(ch))) {
                        ++tokPos;
                    } else {
                        break;
                    }
                }
            }

            // ### Token reading

            // This is the function that is called to fetch the next token. It
            // is somewhat obscure, because it works in character codes rather
            // than characters, and because operator parsing has been inlined
            // into it.
            //
            // All in the name of speed.
            //
            // The `forceRegexp` parameter is used in the one case where the
            // `tokRegexpAllowed` trick does not work. See `parseStatement`.

            function readToken_dot() {
                var next = input.charCodeAt(tokPos + 1);
                if (next >= 48 && next <= 57) return readNumber(true);
                ++tokPos;
                return finishToken(_dot);
            }

            function readToken_slash() { // '/'
                var next = input.charCodeAt(tokPos + 1);
                if (tokRegexpAllowed) {
                    ++tokPos;
                    return readRegexp();
                }
                if (next === 61) return finishOp(_assign, 2);
                return finishOp(_slash, 1);
            }

            function readToken_mult_modulo() { // '%*'
                var next = input.charCodeAt(tokPos + 1);
                if (next === 61) return finishOp(_assign, 2);
                return finishOp(_multiplyModulo, 1);
            }

            function readToken_pipe_amp(code) { // '|&'
                var next = input.charCodeAt(tokPos + 1);
                if (next === code) return finishOp(code === 124 ? _logicalOR : _logicalAND, 2);
                if (next === 61) return finishOp(_assign, 2);
                return finishOp(code === 124 ? _bitwiseOR : _bitwiseAND, 1);
            }

            function readToken_caret() { // '^'
                var next = input.charCodeAt(tokPos + 1);
                if (next === 61) return finishOp(_assign, 2);
                return finishOp(_bitwiseXOR, 1);
            }

            function readToken_plus_min(code) { // '+-'
                var next = input.charCodeAt(tokPos + 1);
                if (next === code) {
                    if (next == 45 && input.charCodeAt(tokPos + 2) == 62 &&
                        newline.test(input.slice(lastEnd, tokPos))) {
                        // A `-->` line comment
                        tokPos += 3;
                        skipLineComment();
                        skipSpace();
                        return readToken();
                    }
                    return finishOp(_incDec, 2);
                }
                if (next === 61) return finishOp(_assign, 2);
                return finishOp(_plusMin, 1);
            }

            function readToken_lt_gt(code) { // '<>'
                var next = input.charCodeAt(tokPos + 1);
                var size = 1;
                if (next === code) {
                    size = code === 62 && input.charCodeAt(tokPos + 2) === 62 ? 3 : 2;
                    if (input.charCodeAt(tokPos + size) === 61) return finishOp(_assign, size + 1);
                    return finishOp(_bitShift, size);
                }
                if (next == 33 && code == 60 && input.charCodeAt(tokPos + 2) == 45 &&
                    input.charCodeAt(tokPos + 3) == 45) {
                    // `<!--`, an XML-style comment that should be interpreted as a line comment
                    tokPos += 4;
                    skipLineComment();
                    skipSpace();
                    return readToken();
                }
                if (next === 61)
                    size = input.charCodeAt(tokPos + 2) === 61 ? 3 : 2;
                return finishOp(_relational, size);
            }

            function readToken_eq_excl(code) { // '=!'
                var next = input.charCodeAt(tokPos + 1);
                if (next === 61) return finishOp(_equality, input.charCodeAt(tokPos + 2) === 61 ? 3 : 2);
                return finishOp(code === 61 ? _eq : _prefix, 1);
            }

            function getTokenFromCode(code) {
                switch (code) {
                    // The interpretation of a dot depends on whether it is followed
                    // by a digit.
                    case 46: // '.'
                        return readToken_dot();

                    // Punctuation tokens.
                    case 40:
                        ++tokPos;
                        return finishToken(_parenL);
                    case 41:
                        ++tokPos;
                        return finishToken(_parenR);
                    case 59:
                        ++tokPos;
                        return finishToken(_semi);
                    case 44:
                        ++tokPos;
                        return finishToken(_comma);
                    case 91:
                        ++tokPos;
                        return finishToken(_bracketL);
                    case 93:
                        ++tokPos;
                        return finishToken(_bracketR);
                    case 123:
                        ++tokPos;
                        return finishToken(_braceL);
                    case 125:
                        ++tokPos;
                        return finishToken(_braceR);
                    case 58:
                        ++tokPos;
                        return finishToken(_colon);
                    case 63:
                        ++tokPos;
                        return finishToken(_question);

                    // '0x' is a hexadecimal number.
                    case 48: // '0'
                        var next = input.charCodeAt(tokPos + 1);
                        if (next === 120 || next === 88) return readHexNumber();
                    // Anything else beginning with a digit is an integer, octal
                    // number, or float.
                    case 49:
                    case 50:
                    case 51:
                    case 52:
                    case 53:
                    case 54:
                    case 55:
                    case 56:
                    case 57: // 1-9
                        return readNumber(false);

                    // Quotes produce strings.
                    case 34:
                    case 39: // '"', "'"
                        return readString(code);

                    // Operators are parsed inline in tiny state machines. '=' (61) is
                    // often referred to. `finishOp` simply skips the amount of
                    // characters it is given as second argument, and returns a token
                    // of the type given by its first argument.

                    case 47: // '/'
                        return readToken_slash(code);

                    case 37:
                    case 42: // '%*'
                        return readToken_mult_modulo();

                    case 124:
                    case 38: // '|&'
                        return readToken_pipe_amp(code);

                    case 94: // '^'
                        return readToken_caret();

                    case 43:
                    case 45: // '+-'
                        return readToken_plus_min(code);

                    case 60:
                    case 62: // '<>'
                        return readToken_lt_gt(code);

                    case 61:
                    case 33: // '=!'
                        return readToken_eq_excl(code);

                    case 126: // '~'
                        return finishOp(_prefix, 1);
                }

                return false;
            }

            function readToken(forceRegexp) {
                if (!forceRegexp) tokStart = tokPos;
                else tokPos = tokStart + 1;
                if (options.locations) tokStartLoc = new line_loc_t;
                if (forceRegexp) return readRegexp();
                if (tokPos >= inputLen) return finishToken(_eof);

                var code = input.charCodeAt(tokPos);
                // Identifier or keyword. '\uXXXX' sequences are allowed in
                // identifiers, so '\' also dispatches to that.
                if (isIdentifierStart(code) || code === 92 /* '\' */) return readWord();

                var tok = getTokenFromCode(code);

                if (tok === false) {
                    // If we are here, we either found a non-ASCII identifier
                    // character, or something that's entirely disallowed.
                    var ch = String.fromCharCode(code);
                    if (ch === "\\" || nonASCIIidentifierStart.test(ch)) return readWord();
                    raise(tokPos, "Unexpected character '" + ch + "'");
                }
                return tok;
            }

            function finishOp(type, size) {
                var str = input.slice(tokPos, tokPos + size);
                tokPos += size;
                finishToken(type, str);
            }

            // Parse a regular expression. Some context-awareness is necessary,
            // since a '/' inside a '[]' set does not end the expression.

            function readRegexp() {
                var content = "", escaped, inClass, start = tokPos;
                for (; ;) {
                    if (tokPos >= inputLen) raise(start, "Unterminated regular expression");
                    var ch = input.charAt(tokPos);
                    if (newline.test(ch)) raise(start, "Unterminated regular expression");
                    if (!escaped) {
                        if (ch === "[") inClass = true;
                        else if (ch === "]" && inClass) inClass = false;
                        else if (ch === "/" && !inClass) break;
                        escaped = ch === "\\";
                    } else escaped = false;
                    ++tokPos;
                }
                var content = input.slice(start, tokPos);
                ++tokPos;
                // Need to use `readWord1` because '\uXXXX' sequences are allowed
                // here (don't ask).
                var mods = readWord1();
                if (mods && !/^[gmsiy]*$/.test(mods)) raise(start, "Invalid regexp flag");
                return finishToken(_regexp, new RegExp(content, mods));
            }

            // Read an integer in the given radix. Return null if zero digits
            // were read, the integer value otherwise. When `len` is given, this
            // will return `null` unless the integer has exactly `len` digits.

            function readInt(radix, len) {
                var start = tokPos, total = 0;
                for (var i = 0, e = len == null ? Infinity : len; i < e; ++i) {
                    var code = input.charCodeAt(tokPos), val;
                    if (code >= 97) val = code - 97 + 10; // a
                    else if (code >= 65) val = code - 65 + 10; // A
                    else if (code >= 48 && code <= 57) val = code - 48; // 0-9
                    else val = Infinity;
                    if (val >= radix) break;
                    ++tokPos;
                    total = total * radix + val;
                }
                if (tokPos === start || len != null && tokPos - start !== len) return null;

                return total;
            }

            function readHexNumber() {
                tokPos += 2; // 0x
                var val = readInt(16);
                if (val == null) raise(tokStart + 2, "Expected hexadecimal number");
                if (isIdentifierStart(input.charCodeAt(tokPos))) raise(tokPos, "Identifier directly after number");
                return finishToken(_num, val);
            }

            // Read an integer, octal integer, or floating-point number.

            function readNumber(startsWithDot) {
                var start = tokPos, isFloat = false, octal = input.charCodeAt(tokPos) === 48;
                if (!startsWithDot && readInt(10) === null) raise(start, "Invalid number");
                if (input.charCodeAt(tokPos) === 46) {
                    ++tokPos;
                    readInt(10);
                    isFloat = true;
                }
                var next = input.charCodeAt(tokPos);
                if (next === 69 || next === 101) { // 'eE'
                    next = input.charCodeAt(++tokPos);
                    if (next === 43 || next === 45) ++tokPos; // '+-'
                    if (readInt(10) === null) raise(start, "Invalid number");
                    isFloat = true;
                }
                if (isIdentifierStart(input.charCodeAt(tokPos))) raise(tokPos, "Identifier directly after number");

                var str = input.slice(start, tokPos), val;
                if (isFloat) val = parseFloat(str);
                else if (!octal || str.length === 1) val = parseInt(str, 10);
                else if (/[89]/.test(str) || strict) raise(start, "Invalid number");
                else val = parseInt(str, 8);
                return finishToken(_num, val);
            }

            // Read a string value, interpreting backslash-escapes.

            function readString(quote) {
                tokPos++;
                var out = "";
                for (; ;) {
                    if (tokPos >= inputLen) raise(tokStart, "Unterminated string constant");
                    var ch = input.charCodeAt(tokPos);
                    if (ch === quote) {
                        ++tokPos;
                        return finishToken(_string, out);
                    }
                    if (ch === 92) { // '\'
                        ch = input.charCodeAt(++tokPos);
                        var octal = /^[0-7]+/.exec(input.slice(tokPos, tokPos + 3));
                        if (octal) octal = octal[0];
                        while (octal && parseInt(octal, 8) > 255) octal = octal.slice(0, -1);
                        if (octal === "0") octal = null;
                        ++tokPos;
                        if (octal) {
                            if (strict) raise(tokPos - 2, "Octal literal in strict mode");
                            out += String.fromCharCode(parseInt(octal, 8));
                            tokPos += octal.length - 1;
                        } else {
                            switch (ch) {
                                case 110:
                                    out += "\n";
                                    break; // 'n' -> '\n'
                                case 114:
                                    out += "\r";
                                    break; // 'r' -> '\r'
                                case 120:
                                    out += String.fromCharCode(readHexChar(2));
                                    break; // 'x'
                                case 117:
                                    out += String.fromCharCode(readHexChar(4));
                                    break; // 'u'
                                case 85:
                                    out += String.fromCharCode(readHexChar(8));
                                    break; // 'U'
                                case 116:
                                    out += "\t";
                                    break; // 't' -> '\t'
                                case 98:
                                    out += "\b";
                                    break; // 'b' -> '\b'
                                case 118:
                                    out += "\u000b";
                                    break; // 'v' -> '\u000b'
                                case 102:
                                    out += "\f";
                                    break; // 'f' -> '\f'
                                case 48:
                                    out += "\0";
                                    break; // 0 -> '\0'
                                case 13:
                                    if (input.charCodeAt(tokPos) === 10) ++tokPos; // '\r\n'
                                case 10: // ' \n'
                                    if (options.locations) {
                                        tokLineStart = tokPos;
                                        ++tokCurLine;
                                    }
                                    break;
                                default:
                                    out += String.fromCharCode(ch);
                                    break;
                            }
                        }
                    } else {
                        if (ch === 13 || ch === 10 || ch === 8232 ||
                            ch === 8233) raise(tokStart, "Unterminated string constant");
                        out += String.fromCharCode(ch); // '\'
                        ++tokPos;
                    }
                }
            }

            // Used to read character escape sequences ('\x', '\u', '\U').

            function readHexChar(len) {
                var n = readInt(16, len);
                if (n === null) raise(tokStart, "Bad character escape sequence");
                return n;
            }

            // Used to signal to callers of `readWord1` whether the word
            // contained any escape sequences. This is needed because words with
            // escape sequences must not be interpreted as keywords.

            var containsEsc;

            // Read an identifier, and return it as a string. Sets `containsEsc`
            // to whether the word contained a '\u' escape.
            //
            // Only builds up the word character-by-character when it actually
            // containeds an escape, as a micro-optimization.

            function readWord1() {
                containsEsc = false;
                var word, first = true, start = tokPos;
                for (; ;) {
                    var ch = input.charCodeAt(tokPos);
                    if (isIdentifierChar(ch)) {
                        if (containsEsc) word += input.charAt(tokPos);
                        ++tokPos;
                    } else if (ch === 92) { // "\"
                        if (!containsEsc) word = input.slice(start, tokPos);
                        containsEsc = true;
                        if (input.charCodeAt(++tokPos) != 117) // "u"
                            raise(tokPos, "Expecting Unicode escape sequence \\uXXXX");
                        ++tokPos;
                        var esc = readHexChar(4);
                        var escStr = String.fromCharCode(esc);
                        if (!escStr) raise(tokPos - 1, "Invalid Unicode escape");
                        if (!(first ? isIdentifierStart(esc) : isIdentifierChar(esc)))
                            raise(tokPos - 4, "Invalid Unicode escape");
                        word += input.substr(tokPos - 6, 6);
                    } else {
                        break;
                    }
                    first = false;
                }
                return containsEsc ? word : input.slice(start, tokPos);
            }

            // Read an identifier or keyword token. Will check for reserved
            // words when necessary.

            function readWord() {
                var word = readWord1();
                var type = _name;
                if (!containsEsc) {
                    if (isKeyword(word)) type = keywordTypes[word];
                    else if (options.forbidReserved &&
                             (options.ecmaVersion === 3 ? isReservedWord3 : isReservedWord5)(word) ||
                             strict && isStrictReservedWord(word))
                        raise(tokStart, "The keyword '" + word + "' is reserved");
                }
                return finishToken(type, word);
            }

            // ## Parser

            // A recursive descent parser operates by defining functions for all
            // syntactic elements, and recursively calling those, each function
            // advancing the input stream and returning an AST node. Precedence
            // of constructs (for example, the fact that `!x[1]` means `!(x[1])`
            // instead of `(!x)[1]` is handled by the fact that the parser
            // function that parses unary prefix operators is called first, and
            // in turn calls the function that parses `[]` subscripts — that
            // way, it'll receive the node for `x[1]` already parsed, and wraps
            // *that* in the unary operator node.
            //
            // Acorn uses an [operator precedence parser][opp] to handle binary
            // operator precedence, because it is much more compact than using
            // the technique outlined above, which uses different, nesting
            // functions to specify precedence, for all of the ten binary
            // precedence levels that JavaScript defines.
            //
            // [opp]: http://en.wikipedia.org/wiki/Operator-precedence_parser

            // ### Parser utilities

            // Continue to the next token.

            function next() {
                lastStart = tokStart;
                lastEnd = tokEnd;
                lastEndLoc = tokEndLoc;
                readToken();
            }

            // Enter strict mode. Re-reads the next token to please pedantic
            // tests ("use strict"; 010; -- should fail).

            function setStrict(strct) {
                strict = strct;
                tokPos = lastEnd;
                if (options.locations) {
                    while (tokPos < tokLineStart) {
                        tokLineStart = input.lastIndexOf("\n", tokLineStart - 2) + 1;
                        --tokCurLine;
                    }
                }
                skipSpace();
                readToken();
            }

            // Start an AST node, attaching a start offset.

            function node_t() {
                this.type = null;
                this.start = tokStart;
                this.end = null;
            }

            function node_loc_t() {
                this.start = tokStartLoc;
                this.end = null;
                if (sourceFile !== null) this.source = sourceFile;
            }

            function startNode() {
                var node = new node_t();
                if (options.locations)
                    node.loc = new node_loc_t();
                if (options.directSourceFile)
                    node.sourceFile = options.directSourceFile;
                if (options.ranges)
                    node.range = [tokStart, 0];
                return node;
            }

            // Start a node whose start offset information should be based on
            // the start of another node. For example, a binary operator node is
            // only started after its left-hand side has already been parsed.

            function startNodeFrom(other) {
                var node = new node_t();
                node.start = other.start;
                if (options.locations) {
                    node.loc = new node_loc_t();
                    node.loc.start = other.loc.start;
                }
                if (options.ranges)
                    node.range = [other.range[0], 0];

                return node;
            }

            // Finish an AST node, adding `type` and `end` properties.

            function finishNode(node, type) {
                node.type = type;
                node.end = lastEnd;
                if (options.locations)
                    node.loc.end = lastEndLoc;
                if (options.ranges)
                    node.range[1] = lastEnd;
                return node;
            }

            // Test whether a statement node is the string literal `"use strict"`.

            function isUseStrict(stmt) {
                return options.ecmaVersion >= 6 && stmt.type === "ExpressionStatement" &&
                       stmt.expression.type === "Literal" && stmt.expression.value === "use strict";
            }

            // Predicate that tests whether the next token is of the given
            // type, and if yes, consumes it as a side effect.

            function eat(type) {
                if (tokType === type) {
                    next();
                    return true;
                }
            }

            // Test whether a semicolon can be inserted at the current position.

            function canInsertSemicolon() {
                return !options.strictSemicolons &&
                       (tokType === _eof || tokType === _braceR || newline.test(input.slice(lastEnd, tokStart)));
            }

            // Consume a semicolon, or, failing that, see if we are allowed to
            // pretend that there is a semicolon at this position.

            function semicolon() {
                if (!eat(_semi) && !canInsertSemicolon()) unexpected();
            }

            // Expect a token of a given type. If found, consume it, otherwise,
            // raise an unexpected token error.

            function expect(type) {
                if (tokType === type) next();
                else unexpected();
            }

            // Raise an unexpected token error.

            function unexpected() {
                raise(tokStart, "Unexpected token");
            }

            // Verify that a node is an lval — something that can be assigned
            // to.

            function checkLVal(expr) {
                if (expr.type !== "Identifier" && expr.type !== "MemberExpression")
                    raise(expr.start, "Assigning to rvalue");
                if (strict && expr.type === "Identifier" && isStrictBadIdWord(expr.name))
                    raise(expr.start, "Assigning to " + expr.name + " in strict mode");
            }

            // ### Statement parsing

            // Parse a program. Initializes the parser, reads any number of
            // statements, and wraps them in a Program node.  Optionally takes a
            // `program` argument.  If present, the statements will be appended
            // to its body instead of creating a new node.

            function parseTopLevel(program) {
                lastStart = lastEnd = tokPos;
                if (options.locations) lastEndLoc = new line_loc_t;
                inFunction = strict = null;
                labels = [];
                readToken();

                var node = program || startNode(), first = true;
                if (!program) node.body = [];
                while (tokType !== _eof) {
                    var stmt = parseStatement();
                    node.body.push(stmt);
                    if (first && isUseStrict(stmt)) setStrict(true);
                    first = false;
                }
                return finishNode(node, "Program");
            }

            var loopLabel = {kind: "loop"}, switchLabel = {kind: "switch"};

            // Parse a single statement.
            //
            // If expecting a statement and finding a slash operator, parse a
            // regular expression literal. This is to handle cases like
            // `if (foo) /blah/.exec(foo);`, where looking at the previous token
            // does not help.

            function parseStatement() {
                if (tokType === _slash || tokType === _assign && tokVal == "/=")
                    readToken(true);

                var starttype = tokType, node = startNode();

                // Most types of statements are recognized by the keyword they
                // start with. Many are trivial to parse, some require a bit of
                // complexity.

                switch (starttype) {
                    case _break:
                    case _continue:
                        next();
                        var isBreak = starttype === _break;
                        if (eat(_semi) || canInsertSemicolon()) node.label = null;
                        else if (tokType !== _name) unexpected();
                        else {
                            node.label = parseIdent();
                            semicolon();
                        }

                        // Verify that there is an actual destination to break or
                        // continue to.
                        for (var i = 0; i < labels.length; ++i) {
                            var lab = labels[i];
                            if (node.label == null || lab.name === node.label.name) {
                                if (lab.kind != null && (isBreak || lab.kind === "loop")) break;
                                if (node.label && isBreak) break;
                            }
                        }
                        if (i === labels.length) raise(node.start, "Unsyntactic " + starttype.keyword);
                        return finishNode(node, isBreak ? "BreakStatement" : "ContinueStatement");

                    case _debugger:
                        next();
                        semicolon();
                        return finishNode(node, "DebuggerStatement");

                    case _do:
                        next();
                        labels.push(loopLabel);
                        node.body = parseStatement();
                        labels.pop();
                        expect(_while);
                        node.test = parseParenExpression();
                        semicolon();
                        return finishNode(node, "DoWhileStatement");

                    // Disambiguating between a `for` and a `for`/`in` loop is
                    // non-trivial. Basically, we have to parse the init `var`
                    // statement or expression, disallowing the `in` operator (see
                    // the second parameter to `parseExpression`), and then check
                    // whether the next token is `in`. When there is no init part
                    // (semicolon immediately after the opening parenthesis), it is
                    // a regular `for` loop.

                    case _for:
                        next();
                        labels.push(loopLabel);
                        expect(_parenL);
                        if (tokType === _semi) return parseFor(node, null);
                        if (tokType === _var) {
                            var init = startNode();
                            next();
                            parseVar(init, true);
                            finishNode(init, "VariableDeclaration");
                            if (init.declarations.length === 1 && eat(_in))
                                return parseForIn(node, init);
                            return parseFor(node, init);
                        }
                        var init = parseExpression(false, true);
                        if (eat(_in)) {
                            checkLVal(init);
                            return parseForIn(node, init);
                        }
                        return parseFor(node, init);

                    case _function:
                        next();
                        return parseFunction(node, true);

                    case _if:
                        next();
                        node.test = parseParenExpression();
                        node.consequent = parseStatement();
                        node.alternate = eat(_else) ? parseStatement() : null;
                        return finishNode(node, "IfStatement");

                    case _return:
                        if (!inFunction) raise(tokStart, "'return' outside of function");
                        next();

                        // In `return` (and `break`/`continue`), the keywords with
                        // optional arguments, we eagerly look for a semicolon or the
                        // possibility to insert one.

                        if (eat(_semi) || canInsertSemicolon()) node.argument = null;
                        else {
                            node.argument = parseExpression();
                            semicolon();
                        }
                        return finishNode(node, "ReturnStatement");

                    case _switch:
                        next();
                        node.discriminant = parseParenExpression();
                        node.cases = [];
                        expect(_braceL);
                        labels.push(switchLabel);

                        // Statements under must be grouped (by label) in SwitchCase
                        // nodes. `cur` is used to keep the node that we are currently
                        // adding statements to.

                        for (var cur, sawDefault; tokType != _braceR;) {
                            if (tokType === _case || tokType === _default) {
                                var isCase = tokType === _case;
                                if (cur) finishNode(cur, "SwitchCase");
                                node.cases.push(cur = startNode());
                                cur.consequent = [];
                                next();
                                if (isCase) cur.test = parseExpression();
                                else {
                                    if (sawDefault) raise(lastStart, "Multiple default clauses");
                                    sawDefault = true;
                                    cur.test = null;
                                }
                                expect(_colon);
                            } else {
                                if (!cur) unexpected();
                                cur.consequent.push(parseStatement());
                            }
                        }
                        if (cur) finishNode(cur, "SwitchCase");
                        next(); // Closing brace
                        labels.pop();
                        return finishNode(node, "SwitchStatement");

                    case _throw:
                        next();
                        if (newline.test(input.slice(lastEnd, tokStart)))
                            raise(lastEnd, "Illegal newline after throw");
                        node.argument = parseExpression();
                        semicolon();
                        return finishNode(node, "ThrowStatement");

                    case _try:
                        next();
                        node.block = parseBlock();
                        node.handler = null;
                        if (tokType === _catch) {
                            var clause = startNode();
                            next();
                            expect(_parenL);
                            clause.param = parseIdent();
                            if (strict && isStrictBadIdWord(clause.param.name))
                                raise(clause.param.start, "Binding " + clause.param.name + " in strict mode");
                            expect(_parenR);
                            clause.guard = null;
                            clause.body = parseBlock();
                            node.handler = finishNode(clause, "CatchClause");
                        }
                        node.guardedHandlers = empty;
                        node.finalizer = eat(_finally) ? parseBlock() : null;
                        if (!node.handler && !node.finalizer)
                            raise(node.start, "Missing catch or finally clause");
                        return finishNode(node, "TryStatement");

                    case _var:
                        next();
                        parseVar(node);
                        semicolon();
                        return finishNode(node, "VariableDeclaration");

                    case _while:
                        next();
                        node.test = parseParenExpression();
                        labels.push(loopLabel);
                        node.body = parseStatement();
                        labels.pop();
                        return finishNode(node, "WhileStatement");

                    case _with:
                        if (strict) raise(tokStart, "'with' in strict mode");
                        next();
                        node.object = parseParenExpression();
                        node.body = parseStatement();
                        return finishNode(node, "WithStatement");

                    case _braceL:
                        return parseBlock();

                    case _semi:
                        next();
                        return finishNode(node, "EmptyStatement");

                    // If the statement does not start with a statement keyword or a
                    // brace, it's an ExpressionStatement or LabeledStatement. We
                    // simply start parsing an expression, and afterwards, if the
                    // next token is a colon and the expression was a simple
                    // Identifier node, we switch to interpreting it as a label.

                    default:
                        var maybeName = tokVal, expr = parseExpression();
                        if (starttype === _name && expr.type === "Identifier" && eat(_colon)) {
                            for (var i = 0; i < labels.length; ++i)
                                if (labels[i].name === maybeName) raise(expr.start, "Label '" + maybeName +
                                                                                    "' is already declared");
                            var kind = tokType.isLoop ? "loop" : tokType === _switch ? "switch" : null;
                            labels.push({name: maybeName, kind: kind});
                            node.body = parseStatement();
                            labels.pop();
                            node.label = expr;
                            return finishNode(node, "LabeledStatement");
                        } else {
                            node.expression = expr;
                            semicolon();
                            return finishNode(node, "ExpressionStatement");
                        }
                }
            }

            // Used for constructs like `switch` and `if` that insist on
            // parentheses around their expression.

            function parseParenExpression() {
                expect(_parenL);
                var val = parseExpression();
                expect(_parenR);
                return val;
            }

            // Parse a semicolon-enclosed block of statements, handling `"use
            // strict"` declarations when `allowStrict` is true (used for
            // function bodies).

            function parseBlock(allowStrict) {
                var node = startNode(), first = true, strict = false, oldStrict;
                node.body = [];
                expect(_braceL);
                while (!eat(_braceR)) {
                    var stmt = parseStatement();
                    node.body.push(stmt);
                    if (first && allowStrict && isUseStrict(stmt)) {
                        oldStrict = strict;
                        setStrict(strict = true);
                    }
                    first = false;
                }
                if (strict && !oldStrict) setStrict(false);
                return finishNode(node, "BlockStatement");
            }

            // Parse a regular `for` loop. The disambiguation code in
            // `parseStatement` will already have parsed the init statement or
            // expression.

            function parseFor(node, init) {
                node.init = init;
                expect(_semi);
                node.test = tokType === _semi ? null : parseExpression();
                expect(_semi);
                node.update = tokType === _parenR ? null : parseExpression();
                expect(_parenR);
                node.body = parseStatement();
                labels.pop();
                return finishNode(node, "ForStatement");
            }

            // Parse a `for`/`in` loop.

            function parseForIn(node, init) {
                node.left = init;
                node.right = parseExpression();
                expect(_parenR);
                node.body = parseStatement();
                labels.pop();
                return finishNode(node, "ForInStatement");
            }

            // Parse a list of variable declarations.

            function parseVar(node, noIn) {
                node.declarations = [];
                node.kind = "var";
                for (; ;) {
                    var decl = startNode();
                    decl.id = parseIdent();
                    if (strict && isStrictBadIdWord(decl.id.name))
                        raise(decl.id.start, "Binding " + decl.id.name + " in strict mode");
                    decl.init = eat(_eq) ? parseExpression(true, noIn) : null;
                    node.declarations.push(finishNode(decl, "VariableDeclarator"));
                    if (!eat(_comma)) break;
                }
                return node;
            }

            // ### Expression parsing

            // These nest, from the most general expression type at the top to
            // 'atomic', nondivisible expression types at the bottom. Most of
            // the functions will simply let the function(s) below them parse,
            // and, *if* the syntactic construct they handle is present, wrap
            // the AST node that the inner parser gave them in another node.

            // Parse a full expression. The arguments are used to forbid comma
            // sequences (in argument lists, array literals, or object literals)
            // or the `in` operator (in for loops initalization expressions).

            function parseExpression(noComma, noIn) {
                var expr = parseMaybeAssign(noIn);
                if (!noComma && tokType === _comma) {
                    var node = startNodeFrom(expr);
                    node.expressions = [expr];
                    while (eat(_comma)) node.expressions.push(parseMaybeAssign(noIn));
                    return finishNode(node, "SequenceExpression");
                }
                return expr;
            }

            // Parse an assignment expression. This includes applications of
            // operators like `+=`.

            function parseMaybeAssign(noIn) {
                var left = parseMaybeConditional(noIn);
                if (tokType.isAssign) {
                    var node = startNodeFrom(left);
                    node.operator = tokVal;
                    node.left = left;
                    next();
                    node.right = parseMaybeAssign(noIn);
                    checkLVal(left);
                    return finishNode(node, "AssignmentExpression");
                }
                return left;
            }

            // Parse a ternary conditional (`?:`) operator.

            function parseMaybeConditional(noIn) {
                var expr = parseExprOps(noIn);
                if (eat(_question)) {
                    var node = startNodeFrom(expr);
                    node.test = expr;
                    node.consequent = parseExpression(true);
                    expect(_colon);
                    node.alternate = parseExpression(true, noIn);
                    return finishNode(node, "ConditionalExpression");
                }
                return expr;
            }

            // Start the precedence parser.

            function parseExprOps(noIn) {
                return parseExprOp(parseMaybeUnary(), -1, noIn);
            }

            // Parse binary operators with the operator precedence parsing
            // algorithm. `left` is the left-hand side of the operator.
            // `minPrec` provides context that allows the function to stop and
            // defer further parser to one of its callers when it encounters an
            // operator that has a lower precedence than the set it is parsing.

            function parseExprOp(left, minPrec, noIn) {
                var prec = tokType.binop;
                if (prec != null && (!noIn || tokType !== _in)) {
                    if (prec > minPrec) {
                        var node = startNodeFrom(left);
                        node.left = left;
                        node.operator = tokVal;
                        var op = tokType;
                        next();
                        node.right = parseExprOp(parseMaybeUnary(), prec, noIn);
                        var exprNode = finishNode(node, (op === _logicalOR || op ===
                                                                              _logicalAND) ? "LogicalExpression" : "BinaryExpression");
                        return parseExprOp(exprNode, minPrec, noIn);
                    }
                }
                return left;
            }

            // Parse unary operators, both prefix and postfix.

            function parseMaybeUnary() {
                if (tokType.prefix) {
                    var node = startNode(), update = tokType.isUpdate;
                    node.operator = tokVal;
                    node.prefix = true;
                    tokRegexpAllowed = true;
                    next();
                    node.argument = parseMaybeUnary();
                    if (update) checkLVal(node.argument);
                    else if (strict && node.operator === "delete" &&
                             node.argument.type === "Identifier")
                        raise(node.start, "Deleting local variable in strict mode");
                    return finishNode(node, update ? "UpdateExpression" : "UnaryExpression");
                }
                var expr = parseExprSubscripts();
                while (tokType.postfix && !canInsertSemicolon()) {
                    var node = startNodeFrom(expr);
                    node.operator = tokVal;
                    node.prefix = false;
                    node.argument = expr;
                    checkLVal(expr);
                    next();
                    expr = finishNode(node, "UpdateExpression");
                }
                return expr;
            }

            // Parse call, dot, and `[]`-subscript expressions.

            function parseExprSubscripts() {
                return parseSubscripts(parseExprAtom());
            }

            function parseSubscripts(base, noCalls) {
                if (eat(_dot)) {
                    var node = startNodeFrom(base);
                    node.object = base;
                    node.property = parseIdent(true);
                    node.computed = false;
                    return parseSubscripts(finishNode(node, "MemberExpression"), noCalls);
                } else if (eat(_bracketL)) {
                    var node = startNodeFrom(base);
                    node.object = base;
                    node.property = parseExpression();
                    node.computed = true;
                    expect(_bracketR);
                    return parseSubscripts(finishNode(node, "MemberExpression"), noCalls);
                } else if (!noCalls && eat(_parenL)) {
                    var node = startNodeFrom(base);
                    node.callee = base;
                    node.arguments = parseExprList(_parenR, false);
                    return parseSubscripts(finishNode(node, "CallExpression"), noCalls);
                } else return base;
            }

            // Parse an atomic expression — either a single token that is an
            // expression, an expression started by a keyword like `function` or
            // `new`, or an expression wrapped in punctuation like `()`, `[]`,
            // or `{}`.

            function parseExprAtom() {
                switch (tokType) {
                    case _this:
                        var node = startNode();
                        next();
                        return finishNode(node, "ThisExpression");
                    case _name:
                        return parseIdent();
                    case _num:
                    case _string:
                    case _regexp:
                        var node = startNode();
                        node.value = tokVal;
                        node.raw = input.slice(tokStart, tokEnd);
                        next();
                        return finishNode(node, "Literal");

                    case _null:
                    case _true:
                    case _false:
                        var node = startNode();
                        node.value = tokType.atomValue;
                        node.raw = tokType.keyword;
                        next();
                        return finishNode(node, "Literal");

                    case _parenL:
                        var tokStartLoc1 = tokStartLoc, tokStart1 = tokStart;
                        next();
                        var val = parseExpression();
                        val.start = tokStart1;
                        val.end = tokEnd;
                        if (options.locations) {
                            val.loc.start = tokStartLoc1;
                            val.loc.end = tokEndLoc;
                        }
                        if (options.ranges)
                            val.range = [tokStart1, tokEnd];
                        expect(_parenR);
                        return val;

                    case _bracketL:
                        var node = startNode();
                        next();
                        node.elements = parseExprList(_bracketR, true, true);
                        return finishNode(node, "ArrayExpression");

                    case _braceL:
                        return parseObj();

                    case _function:
                        var node = startNode();
                        next();
                        return parseFunction(node, false);

                    case _new:
                        return parseNew();

                    default:
                        unexpected();
                }
            }

            // New's precedence is slightly tricky. It must allow its argument
            // to be a `[]` or dot subscript expression, but not a call — at
            // least, not without wrapping it in parentheses. Thus, it uses the

            function parseNew() {
                var node = startNode();
                next();
                node.callee = parseSubscripts(parseExprAtom(), true);
                if (eat(_parenL)) node.arguments = parseExprList(_parenR, false);
                else node.arguments = empty;
                return finishNode(node, "NewExpression");
            }

            // Parse an object literal.

            function parseObj() {
                var node = startNode(), first = true, sawGetSet = false;
                node.properties = [];
                next();
                while (!eat(_braceR)) {
                    if (!first) {
                        expect(_comma);
                        if (options.allowTrailingCommas && eat(_braceR)) break;
                    } else first = false;

                    var prop = {type: "Property", key: parsePropertyName()}, isGetSet = false, kind;
                    if (eat(_colon)) {
                        prop.value = parseExpression(true);
                        kind = prop.kind = "init";
                    } else if (options.ecmaVersion >= 5 && prop.key.type === "Identifier" &&
                               (prop.key.name === "get" || prop.key.name === "set")) {
                        isGetSet = sawGetSet = true;
                        kind = prop.kind = prop.key.name;
                        prop.key = parsePropertyName();
                        if (tokType !== _parenL) unexpected();
                        prop.value = parseFunction(startNode(), false);
                    } else unexpected();

                    // getters and setters are not allowed to clash — either with
                    // each other or with an init property — and in strict mode,
                    // init properties are also not allowed to be repeated.

                    if (prop.key.type === "Identifier" && (strict || sawGetSet)) {
                        for (var i = 0; i < node.properties.length; ++i) {
                            var other = node.properties[i];
                            if (other.key.name === prop.key.name) {
                                var conflict = kind == other.kind || isGetSet && other.kind === "init" ||
                                               kind === "init" && (other.kind === "get" || other.kind === "set");
                                if (conflict && !strict && kind === "init" && other.kind === "init") conflict = false;
                                if (conflict) raise(prop.key.start, "Redefinition of property");
                            }
                        }
                    }
                    node.properties.push(prop);
                }
                return finishNode(node, "ObjectExpression");
            }

            function parsePropertyName() {
                if (tokType === _num || tokType === _string) return parseExprAtom();
                return parseIdent(true);
            }

            // Parse a function declaration or literal (depending on the
            // `isStatement` parameter).

            function parseFunction(node, isStatement) {
                if (tokType === _name) node.id = parseIdent();
                else if (isStatement) unexpected();
                else node.id = null;
                node.params = [];
                var first = true;
                expect(_parenL);
                while (!eat(_parenR)) {
                    if (!first) expect(_comma); else first = false;
                    node.params.push(parseIdent());
                }

                // Start a new scope with regard to labels and the `inFunction`
                // flag (restore them to their old value afterwards).
                var oldInFunc = inFunction, oldLabels = labels;
                inFunction = true;
                labels = [];
                node.body = parseBlock(true);
                inFunction = oldInFunc;
                labels = oldLabels;

                // If this is a strict mode function, verify that argument names
                // are not repeated, and it does not try to bind the words `eval`
                // or `arguments`.
                if (strict || node.body.body.length && isUseStrict(node.body.body[0])) {
                    for (var i = node.id ? -1 : 0; i < node.params.length; ++i) {
                        var id = i < 0 ? node.id : node.params[i];
                        if (isStrictReservedWord(id.name) || isStrictBadIdWord(id.name))
                            raise(id.start, "Defining '" + id.name + "' in strict mode");
                        if (i >= 0) for (var j = 0; j < i; ++j) if (id.name === node.params[j].name)
                            raise(id.start, "Argument name clash in strict mode");
                    }
                }

                return finishNode(node, isStatement ? "FunctionDeclaration" : "FunctionExpression");
            }

            // Parses a comma-separated list of expressions, and returns them as
            // an array. `close` is the token type that ends the list, and
            // `allowEmpty` can be turned on to allow subsequent commas with
            // nothing in between them to be parsed as `null` (which is needed
            // for array literals).

            function parseExprList(close, allowTrailingComma, allowEmpty) {
                var elts = [], first = true;
                while (!eat(close)) {
                    if (!first) {
                        expect(_comma);
                        if (allowTrailingComma && options.allowTrailingCommas && eat(close)) break;
                    } else first = false;

                    if (allowEmpty && tokType === _comma) elts.push(null);
                    else elts.push(parseExpression(true));
                }
                return elts;
            }

            // Parse the next token as an identifier. If `liberal` is true (used
            // when parsing properties), it will also convert keywords into
            // identifiers.

            function parseIdent(liberal) {
                var node = startNode();
                node.name = tokType === _name ? tokVal : (liberal && !options.forbidReserved && tokType.keyword) ||
                                                         unexpected();
                tokRegexpAllowed = false;
                next();
                return finishNode(node, "Identifier");
            }

        });
    }).call(acornExports);

    JSParsingTools.parse = acornExports.parse || acornExports.acorn.parse;
    // ------------------------------------------

    // --------------- Code Gen -----------------
    var codeGetExports = {};

    (function (exports) {
        /*
         Copyright (C) 2014 Ivan Nikulin <ifaaan@gmail.com>
         Copyright (C) 2012-2014 Yusuke Suzuki <utatane.tea@gmail.com>
         Copyright (C) 2012-2013 Michael Ficarra <escodegen.copyright@michael.ficarra.me>
         Copyright (C) 2012-2013 Mathias Bynens <mathias@qiwi.be>
         Copyright (C) 2013 Irakli Gozalishvili <rfobic@gmail.com>
         Copyright (C) 2012 Robert Gust-Bardon <donate@robert.gust-bardon.org>
         Copyright (C) 2012 John Freeman <jfreeman08@gmail.com>
         Copyright (C) 2011-2012 Ariya Hidayat <ariya.hidayat@gmail.com>
         Copyright (C) 2012 Joost-Wim Boekesteijn <joost-wim@boekesteijn.nl>
         Copyright (C) 2012 Kris Kowal <kris.kowal@cixar.com>
         Copyright (C) 2012 Arpad Borsos <arpad.borsos@googlemail.com>

         Redistribution and use in source and binary forms, with or without
         modification, are permitted provided that the following conditions are met:

         * Redistributions of source code must retain the above copyright
         notice, this list of conditions and the following disclaimer.
         * Redistributions in binary form must reproduce the above copyright
         notice, this list of conditions and the following disclaimer in the
         documentation and/or other materials provided with the distribution.

         THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
         AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
         IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
         ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
         DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
         (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
         LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
         ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
         (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
         THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
         */

        'use strict';

        var isArray,
            json,
            renumber,
            hexadecimal,
            quotes,
            escapeless,
            parentheses,
            semicolons,
            safeConcatenation,
            directive,
            extra,
            parse,
            FORMAT_MINIFY,
            FORMAT_DEFAULTS;

        var Syntax = {
            AssignmentExpression: 'AssignmentExpression',
            ArrayExpression: 'ArrayExpression',
            ArrayPattern: 'ArrayPattern',
            ArrowFunctionExpression: 'ArrowFunctionExpression',
            BlockStatement: 'BlockStatement',
            BinaryExpression: 'BinaryExpression',
            BreakStatement: 'BreakStatement',
            CallExpression: 'CallExpression',
            CatchClause: 'CatchClause',
            ClassBody: 'ClassBody',
            ClassDeclaration: 'ClassDeclaration',
            ClassExpression: 'ClassExpression',
            ComprehensionBlock: 'ComprehensionBlock',
            ComprehensionExpression: 'ComprehensionExpression',
            ConditionalExpression: 'ConditionalExpression',
            ContinueStatement: 'ContinueStatement',
            DirectiveStatement: 'DirectiveStatement',
            DoWhileStatement: 'DoWhileStatement',
            DebuggerStatement: 'DebuggerStatement',
            EmptyStatement: 'EmptyStatement',
            ExportBatchSpecifier: 'ExportBatchSpecifier',
            ExportDeclaration: 'ExportDeclaration',
            ExportSpecifier: 'ExportSpecifier',
            ExpressionStatement: 'ExpressionStatement',
            ForStatement: 'ForStatement',
            ForInStatement: 'ForInStatement',
            ForOfStatement: 'ForOfStatement',
            FunctionDeclaration: 'FunctionDeclaration',
            FunctionExpression: 'FunctionExpression',
            GeneratorExpression: 'GeneratorExpression',
            Identifier: 'Identifier',
            IfStatement: 'IfStatement',
            ImportSpecifier: 'ImportSpecifier',
            ImportDeclaration: 'ImportDeclaration',
            Literal: 'Literal',
            LabeledStatement: 'LabeledStatement',
            LogicalExpression: 'LogicalExpression',
            MemberExpression: 'MemberExpression',
            MethodDefinition: 'MethodDefinition',
            ModuleDeclaration: 'ModuleDeclaration',
            NewExpression: 'NewExpression',
            ObjectExpression: 'ObjectExpression',
            ObjectPattern: 'ObjectPattern',
            Program: 'Program',
            Property: 'Property',
            ReturnStatement: 'ReturnStatement',
            SequenceExpression: 'SequenceExpression',
            SpreadElement: 'SpreadElement',
            SwitchStatement: 'SwitchStatement',
            SwitchCase: 'SwitchCase',
            TaggedTemplateExpression: 'TaggedTemplateExpression',
            TemplateElement: 'TemplateElement',
            TemplateLiteral: 'TemplateLiteral',
            ThisExpression: 'ThisExpression',
            ThrowStatement: 'ThrowStatement',
            TryStatement: 'TryStatement',
            UnaryExpression: 'UnaryExpression',
            UpdateExpression: 'UpdateExpression',
            VariableDeclaration: 'VariableDeclaration',
            VariableDeclarator: 'VariableDeclarator',
            WhileStatement: 'WhileStatement',
            WithStatement: 'WithStatement',
            YieldExpression: 'YieldExpression'
        };

        var Precedence = {
            Sequence: 0,
            Yield: 1,
            Assignment: 1,
            Conditional: 2,
            ArrowFunction: 2,
            LogicalOR: 3,
            LogicalAND: 4,
            BitwiseOR: 5,
            BitwiseXOR: 6,
            BitwiseAND: 7,
            Equality: 8,
            Relational: 9,
            BitwiseSHIFT: 10,
            Additive: 11,
            Multiplicative: 12,
            Unary: 13,
            Postfix: 14,
            Call: 15,
            New: 16,
            TaggedTemplate: 17,
            Member: 18,
            Primary: 19
        };

        var BinaryPrecedence = {
            '||': Precedence.LogicalOR,
            '&&': Precedence.LogicalAND,
            '|': Precedence.BitwiseOR,
            '^': Precedence.BitwiseXOR,
            '&': Precedence.BitwiseAND,
            '==': Precedence.Equality,
            '!=': Precedence.Equality,
            '===': Precedence.Equality,
            '!==': Precedence.Equality,
            'is': Precedence.Equality,
            'isnt': Precedence.Equality,
            '<': Precedence.Relational,
            '>': Precedence.Relational,
            '<=': Precedence.Relational,
            '>=': Precedence.Relational,
            'in': Precedence.Relational,
            'instanceof': Precedence.Relational,
            '<<': Precedence.BitwiseSHIFT,
            '>>': Precedence.BitwiseSHIFT,
            '>>>': Precedence.BitwiseSHIFT,
            '+': Precedence.Additive,
            '-': Precedence.Additive,
            '*': Precedence.Multiplicative,
            '%': Precedence.Multiplicative,
            '/': Precedence.Multiplicative
        };

        function getDefaultOptions() {
            // default options
            return {
                indent: null,
                base: null,
                parse: null,
                format: {
                    indent: {
                        style: '    ',
                        base: 0
                    },
                    newline: '\n',
                    space: ' ',
                    json: false,
                    renumber: false,
                    hexadecimal: false,
                    quotes: 'single',
                    escapeless: false,
                    compact: false,
                    parentheses: true,
                    semicolons: true,
                    safeConcatenation: false
                },
                directive: false,
                raw: true,
                verbatim: null
            };
        }

        //-------------------------------------------------===------------------------------------------------------
        //                                            Lexical utils
        //-------------------------------------------------===------------------------------------------------------

        //Const
        var NON_ASCII_WHITESPACES = [
            0x1680, 0x180E, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005,
            0x2006, 0x2007, 0x2008, 0x2009, 0x200A, 0x202F, 0x205F, 0x3000,
            0xFEFF
        ];

        //Regular expressions
        var NON_ASCII_IDENTIFIER_CHARACTERS_REGEXP = new RegExp(
            '[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0300-\u0374\u0376' +
            '\u0377\u037A-\u037D\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u0483-\u0487\u048A-' +
            '\u0527\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u05D0-\u05EA' +
            '\u05F0-\u05F2\u0610-\u061A\u0620-\u0669\u066E-\u06D3\u06D5-\u06DC\u06DF-\u06E8\u06EA-\u06FC\u06FF\u0710-' +
            '\u074A\u074D-\u07B1\u07C0-\u07F5\u07FA\u0800-\u082D\u0840-\u085B\u08A0\u08A2-\u08AC\u08E4-\u08FE\u0900-' +
            '\u0963\u0966-\u096F\u0971-\u0977\u0979-\u097F\u0981-\u0983\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-' +
            '\u09B0\u09B2\u09B6-\u09B9\u09BC-\u09C4\u09C7\u09C8\u09CB-\u09CE\u09D7\u09DC\u09DD\u09DF-\u09E3\u09E6-' +
            '\u09F1\u0A01-\u0A03\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38' +
            '\u0A39\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A59-\u0A5C\u0A5E\u0A66-\u0A75\u0A81-\u0A83' +
            '\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABC-\u0AC5\u0AC7-\u0AC9' +
            '\u0ACB-\u0ACD\u0AD0\u0AE0-\u0AE3\u0AE6-\u0AEF\u0B01-\u0B03\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-' +
            '\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3C-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B5C\u0B5D\u0B5F-' +
            '\u0B63\u0B66-\u0B6F\u0B71\u0B82\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E' +
            '\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD0\u0BD7\u0BE6-' +
            '\u0BEF\u0C01-\u0C03\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C33\u0C35-\u0C39\u0C3D-\u0C44\u0C46-' +
            '\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C58\u0C59\u0C60-\u0C63\u0C66-\u0C6F\u0C82\u0C83\u0C85-\u0C8C\u0C8E-' +
            '\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBC-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CDE' +
            '\u0CE0-\u0CE3\u0CE6-\u0CEF\u0CF1\u0CF2\u0D02\u0D03\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D-\u0D44' +
            '\u0D46-\u0D48\u0D4A-\u0D4E\u0D57\u0D60-\u0D63\u0D66-\u0D6F\u0D7A-\u0D7F\u0D82\u0D83\u0D85-\u0D96\u0D9A-' +
            '\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DF2\u0DF3\u0E01-\u0E3A' +
            '\u0E40-\u0E4E\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-' +
            '\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB9\u0EBB-\u0EBD\u0EC0-\u0EC4\u0EC6\u0EC8-\u0ECD\u0ED0-\u0ED9' +
            '\u0EDC-\u0EDF\u0F00\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E-\u0F47\u0F49-\u0F6C\u0F71-\u0F84' +
            '\u0F86-\u0F97\u0F99-\u0FBC\u0FC6\u1000-\u1049\u1050-\u109D\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-' +
            '\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5' +
            '\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u135D-\u135F\u1380-' +
            '\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F0\u1700-\u170C\u170E-' +
            '\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176C\u176E-\u1770\u1772\u1773\u1780-\u17D3\u17D7\u17DC\u17DD' +
            '\u17E0-\u17E9\u180B-\u180D\u1810-\u1819\u1820-\u1877\u1880-\u18AA\u18B0-\u18F5\u1900-\u191C\u1920-\u192B' +
            '\u1930-\u193B\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19D9\u1A00-\u1A1B\u1A20-\u1A5E' +
            '\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AA7\u1B00-\u1B4B\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1BF3\u1C00-' +
            '\u1C37\u1C40-\u1C49\u1C4D-\u1C7D\u1CD0-\u1CD2\u1CD4-\u1CF6\u1D00-\u1DE6\u1DFC-\u1F15\u1F18-\u1F1D\u1F20-' +
            '\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-' +
            '\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u200C\u200D\u203F' +
            '\u2040\u2054\u2071\u207F\u2090-\u209C\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2102\u2107\u210A-\u2113\u2115' +
            '\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188' +
            '\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D7F-' +
            '\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-' +
            '\u2DDE\u2DE0-\u2DFF\u2E2F\u3005-\u3007\u3021-\u302F\u3031-\u3035\u3038-\u303C\u3041-\u3096\u3099\u309A' +
            '\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5' +
            '\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66F\uA674-\uA67D\uA67F-\uA697' +
            '\uA69F-\uA6F1\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA793\uA7A0-\uA7AA\uA7F8-\uA827\uA840-\uA873' +
            '\uA880-\uA8C4\uA8D0-\uA8D9\uA8E0-\uA8F7\uA8FB\uA900-\uA92D\uA930-\uA953\uA960-\uA97C\uA980-\uA9C0\uA9CF-' +
            '\uA9D9\uAA00-\uAA36\uAA40-\uAA4D\uAA50-\uAA59\uAA60-\uAA76\uAA7A\uAA7B\uAA80-\uAAC2\uAADB-\uAADD\uAAE0-' +
            '\uAAEF\uAAF2-\uAAF6\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uABC0-\uABEA\uABEC' +
            '\uABED\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-' +
            '\uFB17\uFB1D-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D' +
            '\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE00-\uFE0F\uFE20-\uFE26\uFE33\uFE34\uFE4D-\uFE4F\uFE70-\uFE74' +
            '\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF3F\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-' +
            '\uFFD7\uFFDA-\uFFDC]'
        );


        //Methods
        function isIdentifierCh(cp) {
            if (cp < 0x80) {
                return cp >= 97 && cp <= 122 ||      // a..z
                       cp >= 65 && cp <= 90 ||       // A..Z
                       cp >= 48 && cp <= 57 ||       // 0..9
                       cp === 36 || cp === 95 ||     // $ (dollar) and _ (underscore)
                       cp === 92;                    // \ (backslash)
            }

            var ch = String.fromCharCode(cp);

            return NON_ASCII_IDENTIFIER_CHARACTERS_REGEXP.test(ch);
        }

        function isLineTerminator(cp) {
            return cp === 0x0A || cp === 0x0D || cp === 0x2028 || cp === 0x2029;
        }

        function isWhitespace(cp) {
            return cp === 0x20 || cp === 0x09 || isLineTerminator(cp) || cp === 0x0B || cp === 0x0C || cp === 0xA0 ||
                   (cp >= 0x1680 && NON_ASCII_WHITESPACES.indexOf(cp) >= 0);
        }

        function isDecimalDigit(cp) {
            return cp >= 48 && cp <= 57;
        }

        function stringRepeat(str, num) {
            var result = '';

            for (num |= 0; num > 0; num >>>= 1, str += str) {
                if (num & 1) {
                    result += str;
                }
            }

            return result;
        }

        isArray = Array.isArray;
        if (!isArray) {
            isArray = function isArray(array) {
                return Object.prototype.toString.call(array) === '[object Array]';
            };
        }


        function updateDeeply(target, override) {
            var key, val;

            function isHashObject(target) {
                return typeof target === 'object' && target instanceof Object && !(target instanceof RegExp);
            }

            for (key in override) {
                if (override.hasOwnProperty(key)) {
                    val = override[key];
                    if (isHashObject(val)) {
                        if (isHashObject(target[key])) {
                            updateDeeply(target[key], val);
                        } else {
                            target[key] = updateDeeply({}, val);
                        }
                    } else {
                        target[key] = val;
                    }
                }
            }
            return target;
        }

        function generateNumber(value) {
            var result, point, temp, exponent, pos;

            if (value === 1 / 0) {
                return json ? 'null' : renumber ? '1e400' : '1e+400';
            }

            result = '' + value;
            if (!renumber || result.length < 3) {
                return result;
            }

            point = result.indexOf('.');
            //NOTE: 0x30 == '0'
            if (!json && result.charCodeAt(0) === 0x30 && point === 1) {
                point = 0;
                result = result.slice(1);
            }
            temp = result;
            result = result.replace('e+', 'e');
            exponent = 0;
            if ((pos = temp.indexOf('e')) > 0) {
                exponent = +temp.slice(pos + 1);
                temp = temp.slice(0, pos);
            }
            if (point >= 0) {
                exponent -= temp.length - point - 1;
                temp = +(temp.slice(0, point) + temp.slice(point + 1)) + '';
            }
            pos = 0;

            //NOTE: 0x30 == '0'
            while (temp.charCodeAt(temp.length + pos - 1) === 0x30) {
                --pos;
            }
            if (pos !== 0) {
                exponent -= pos;
                temp = temp.slice(0, pos);
            }
            if (exponent !== 0) {
                temp += 'e' + exponent;
            }
            if ((temp.length < result.length ||
                 (hexadecimal && value > 1e12 && Math.floor(value) === value &&
                  (temp = '0x' + value.toString(16)).length
                  < result.length)) &&
                +temp === value) {
                result = temp;
            }

            return result;
        }

        // Generate valid RegExp expression.
        // This function is based on https://github.com/Constellation/iv Engine

        function escapeRegExpCharacter(ch, previousIsBackslash) {
            // not handling '\' and handling \u2028 or \u2029 to unicode escape sequence
            if ((ch & ~1) === 0x2028) {
                return (previousIsBackslash ? 'u' : '\\u') + ((ch === 0x2028) ? '2028' : '2029');
            } else if (ch === 10 || ch === 13) {  // \n, \r
                return (previousIsBackslash ? '' : '\\') + ((ch === 10) ? 'n' : 'r');
            }
            return String.fromCharCode(ch);
        }

        function generateRegExp(reg) {
            var match, result, flags, i, iz, ch, characterInBrack, previousIsBackslash;

            result = reg.toString();

            if (reg.source) {
                // extract flag from toString result
                match = result.match(/\/([^/]*)$/);
                if (!match) {
                    return result;
                }

                flags = match[1];
                result = '';

                characterInBrack = false;
                previousIsBackslash = false;
                for (i = 0, iz = reg.source.length; i < iz; ++i) {
                    ch = reg.source.charCodeAt(i);

                    if (!previousIsBackslash) {
                        if (characterInBrack) {
                            if (ch === 93) {  // ]
                                characterInBrack = false;
                            }
                        } else {
                            if (ch === 47) {  // /
                                result += '\\';
                            } else if (ch === 91) {  // [
                                characterInBrack = true;
                            }
                        }
                        result += escapeRegExpCharacter(ch, previousIsBackslash);
                        previousIsBackslash = ch === 92;  // \
                    } else {
                        // if new RegExp("\\\n') is provided, create /\n/
                        result += escapeRegExpCharacter(ch, previousIsBackslash);
                        // prevent like /\\[/]/
                        previousIsBackslash = false;
                    }
                }

                return '/' + result + '/' + flags;
            }

            return result;
        }

        function escapeAllowedCharacter(code, next) {
            var hex, result = '\\';

            switch (code) {
                case 0x08:          // \b
                    result += 'b';
                    break;
                case 0x0C:          // \f
                    result += 'f';
                    break;
                case 0x09:          // \t
                    result += 't';
                    break;
                default:
                    hex = code.toString(16).toUpperCase();
                    if (json || code > 0xFF) {
                        result += 'u' + '0000'.slice(hex.length) + hex;
                    }

                    else if (code === 0x0000 && !isDecimalDigit(next)) {
                        result += '0';
                    }

                    else if (code === 0x000B) {     // \v
                        result += 'x0B';
                    }

                    else {
                        result += 'x' + '00'.slice(hex.length) + hex;
                    }
                    break;
            }

            return result;
        }

        function escapeDisallowedCharacter(code) {
            var result = '\\';
            switch (code) {
                case 0x5C       // \
                :
                    result += '\\';
                    break;
                case 0x0A       // \n
                :
                    result += 'n';
                    break;
                case 0x0D       // \r
                :
                    result += 'r';
                    break;
                case 0x2028:
                    result += 'u2028';
                    break;
                case 0x2029:
                    result += 'u2029';
                    break;
            }

            return result;
        }

        function escapeDirective(str) {
            var i, iz, code, quote;

            quote = quotes === 'double' ? '"' : '\'';
            for (i = 0, iz = str.length; i < iz; ++i) {
                code = str.charCodeAt(i);
                if (code === 0x27) {            // '
                    quote = '"';
                    break;
                } else if (code === 0x22) {     // "
                    quote = '\'';
                    break;
                } else if (code === 0x5C) {     // \
                    ++i;
                }
            }

            return quote + str + quote;
        }

        function escapeString(str) {
            var result = '', i, len, code, singleQuotes = 0, doubleQuotes = 0, single, quote;
            //TODO http://jsperf.com/character-counting/8
            for (i = 0, len = str.length; i < len; ++i) {
                code = str.charCodeAt(i);
                if (code === 0x27) {           // '
                    ++singleQuotes;
                } else if (code === 0x22) { // "
                    ++doubleQuotes;
                } else if (code === 0x2F && json) { // /
                    result += '\\';
                } else if (isLineTerminator(code) || code === 0x5C) { // \
                    result += escapeDisallowedCharacter(code);
                    continue;
                } else if ((json && code < 0x20) ||                                     // SP
                           !(json || escapeless || (code >= 0x20 && code <= 0x7E))) {   // SP, ~
                    result += escapeAllowedCharacter(code, str.charCodeAt(i + 1));
                    continue;
                }
                result += String.fromCharCode(code);
            }

            single = !(quotes === 'double' || (quotes === 'auto' && doubleQuotes < singleQuotes));
            quote = single ? '\'' : '"';

            if (!(single ? singleQuotes : doubleQuotes)) {
                return quote + result + quote;
            }

            str = result;
            result = quote;

            for (i = 0, len = str.length; i < len; ++i) {
                code = str.charCodeAt(i);
                if ((code === 0x27 && single) || (code === 0x22 && !single)) {    // ', "
                    result += '\\';
                }
                result += String.fromCharCode(code);
            }

            return result + quote;
        }


        function join(l, r) {
            if (!l.length)
                return r;

            if (!r.length)
                return l;

            var lCp = l.charCodeAt(l.length - 1),
                rCp = r.charCodeAt(0);

            if (isIdentifierCh(lCp) && isIdentifierCh(rCp) ||
                lCp === rCp && (lCp === 0x2B || lCp === 0x2D) ||   // + +, - -
                lCp === 0x2F && rCp === 0x69) {                    // /re/ instanceof foo
                return l + _.space + r;
            }

            else if (isWhitespace(lCp) || isWhitespace(rCp))
                return l + r;

            return l + _.optSpace + r;
        }

        function shiftIndent() {
            var prevIndent = _.indent;

            _.indent += _.indentUnit;
            return prevIndent;
        }

        function adoptionPrefix($stmt) {
            if ($stmt.type === Syntax.BlockStatement)
                return _.optSpace;

            if ($stmt.type === Syntax.EmptyStatement)
                return '';

            return _.newline + _.indent + _.indentUnit;
        }

        function adoptionSuffix($stmt) {
            if ($stmt.type === Syntax.BlockStatement)
                return _.optSpace;

            return _.newline + _.indent;
        }

        //Subentities generators
        function generateVerbatim($expr, settings) {
            var verbatim = $expr[extra.verbatim],
                strVerbatim = typeof verbatim === 'string',
                precedence = !strVerbatim && verbatim.precedence !== void 0 ? verbatim.precedence : Precedence.Sequence,
                parenthesize = precedence < settings.precedence,
                content = strVerbatim ? verbatim : verbatim.content,
                chunks = content.split(/\r\n|\n/),
                chunkCount = chunks.length;

            if (parenthesize)
                _.js += '(';

            _.js += chunks[0];

            for (var i = 1; i < chunkCount; i++)
                _.js += _.newline + _.indent + chunks[i];

            if (parenthesize)
                _.js += ')';
        }

        function generateFunctionParams($node) {
            var $params = $node.params,
                $rest = $node.rest,
                $defaults = $node.defaults,
                paramCount = $params.length,
                lastParamIdx = paramCount - 1,
                hasDefaults = !!$defaults,
                arrowFuncWithSingleParam = $node.type === Syntax.ArrowFunctionExpression && !$rest &&
                                           (!hasDefaults || $defaults.length === 0) &&
                                           paramCount === 1 &&
                                           $params[0].type === Syntax.Identifier;

            //NOTE: arg => { } case
            if (arrowFuncWithSingleParam)
                _.js += $params[0].name;

            else {
                _.js += '(';

                for (var i = 0; i < paramCount; ++i) {
                    var $param = $params[i];

                    if (hasDefaults && $defaults[i]) {
                        var $fakeAssign = {
                            left: $param,
                            right: $defaults[i],
                            operator: '='
                        };

                        ExprGen.AssignmentExpression($fakeAssign, Preset.e4);
                    }

                    else {
                        if ($params[i].type === Syntax.Identifier)
                            _.js += $param.name;

                        else
                            ExprGen[$param.type]($param, Preset.e4);
                    }

                    if (i !== lastParamIdx)
                        _.js += ',' + _.optSpace;
                }

                if ($rest) {
                    if (paramCount)
                        _.js += ',' + _.optSpace;

                    _.js += '...' + $rest.name;
                }

                _.js += ')';
            }
        }

        function generateFunctionBody($node) {
            var $body = $node.body;

            generateFunctionParams($node);

            if ($node.type === Syntax.ArrowFunctionExpression)
                _.js += _.optSpace + '=>';

            if ($node.expression) {
                _.js += _.optSpace;

                var exprJs = exprToJs($body, Preset.e4);

                if (exprJs.charAt(0) === '{')
                    exprJs = '(' + exprJs + ')';

                _.js += exprJs;
            }

            else {
                _.js += adoptionPrefix($body);
                StmtGen[$body.type]($body, Preset.s8);
            }
        }


        //-------------------------------------------------===------------------------------------------------------
        //                                Syntactic entities generation presets
        //-------------------------------------------------===------------------------------------------------------

        var Preset = {
            e1: function (allowIn) {
                return {
                    precedence: Precedence.Assignment,
                    allowIn: allowIn,
                    allowCall: true,
                    allowUnparenthesizedNew: true
                };
            },

            e2: function (allowIn) {
                return {
                    precedence: Precedence.LogicalOR,
                    allowIn: allowIn,
                    allowCall: true,
                    allowUnparenthesizedNew: true
                };
            },

            e3: {
                precedence: Precedence.Call,
                allowIn: true,
                allowCall: true,
                allowUnparenthesizedNew: false
            },

            e4: {
                precedence: Precedence.Assignment,
                allowIn: true,
                allowCall: true,
                allowUnparenthesizedNew: true
            },

            e5: {
                precedence: Precedence.Sequence,
                allowIn: true,
                allowCall: true,
                allowUnparenthesizedNew: true
            },

            e6: function (allowUnparenthesizedNew) {
                return {
                    precedence: Precedence.New,
                    allowIn: true,
                    allowCall: false,
                    allowUnparenthesizedNew: allowUnparenthesizedNew
                };
            },

            e7: {
                precedence: Precedence.Unary,
                allowIn: true,
                allowCall: true,
                allowUnparenthesizedNew: true
            },

            e8: {
                precedence: Precedence.Postfix,
                allowIn: true,
                allowCall: true,
                allowUnparenthesizedNew: true
            },

            e9: {
                precedence: void 0,
                allowIn: true,
                allowCall: true,
                allowUnparenthesizedNew: true
            },

            e10: {
                precedence: Precedence.Call,
                allowIn: true,
                allowCall: true,
                allowUnparenthesizedNew: true
            },

            e11: function (allowCall) {
                return {
                    precedence: Precedence.Call,
                    allowIn: true,
                    allowCall: allowCall,
                    allowUnparenthesizedNew: false
                };
            },

            e12: {
                precedence: Precedence.Primary,
                allowIn: false,
                allowCall: false,
                allowUnparenthesizedNew: true
            },

            e13: {
                precedence: Precedence.Primary,
                allowIn: true,
                allowCall: true,
                allowUnparenthesizedNew: true
            },


            e14: {
                precedence: Precedence.Sequence,
                allowIn: false,
                allowCall: true,
                allowUnparenthesizedNew: true
            },


            e15: function (allowCall) {
                return {
                    precedence: Precedence.Sequence,
                    allowIn: true,
                    allowCall: allowCall,
                    allowUnparenthesizedNew: true
                };
            },

            e16: function (precedence, allowIn) {
                return {
                    precedence: precedence,
                    allowIn: allowIn,
                    allowCall: true,
                    allowUnparenthesizedNew: true
                };
            },

            e17: function (allowIn) {
                return {
                    precedence: Precedence.Call,
                    allowIn: allowIn,
                    allowCall: true,
                    allowUnparenthesizedNew: true
                }
            },

            e18: function (allowIn) {
                return {
                    precedence: Precedence.Assignment,
                    allowIn: allowIn,
                    allowCall: true,
                    allowUnparenthesizedNew: true
                }
            },

            e19: {
                precedence: Precedence.Sequence,
                allowIn: true,
                allowCall: true,
                semicolonOptional: false
            },

            s1: function (functionBody, semicolonOptional) {
                return {
                    allowIn: true,
                    functionBody: false,
                    directiveContext: functionBody,
                    semicolonOptional: semicolonOptional
                };
            },

            s2: {
                allowIn: true,
                functionBody: false,
                directiveContext: false,
                semicolonOptional: true
            },

            s3: function (allowIn) {
                return {
                    allowIn: allowIn,
                    functionBody: false,
                    directiveContext: false,
                    semicolonOptional: false
                };
            },

            s4: function (semicolonOptional) {
                return {
                    allowIn: true,
                    functionBody: false,
                    directiveContext: false,
                    semicolonOptional: semicolonOptional
                };
            },

            s5: function (semicolonOptional) {
                return {
                    allowIn: true,
                    functionBody: false,
                    directiveContext: true,
                    semicolonOptional: semicolonOptional,
                };
            },

            s6: {
                allowIn: false,
                functionBody: false,
                directiveContext: false,
                semicolonOptional: false
            },

            s7: {
                allowIn: true,
                functionBody: false,
                directiveContext: false,
                semicolonOptional: false
            },

            s8: {
                allowIn: true,
                functionBody: true,
                directiveContext: false,
                semicolonOptional: false
            }
        };


        //-------------------------------------------------===-------------------------------------------------------
        //                                             Expressions
        //-------------------------------------------------===-------------------------------------------------------

        //Regular expressions
        var FLOATING_OR_OCTAL_REGEXP = /[.eExX]|^0[0-9]+/,
            LAST_DECIMAL_DIGIT_REGEXP = /[0-9]$/;


        //Common expression generators
        function generateLogicalOrBinaryExpression($expr, settings) {
            var op = $expr.operator,
                precedence = BinaryPrecedence[$expr.operator],
                parenthesize = precedence < settings.precedence,
                allowIn = settings.allowIn || parenthesize,
                operandGenSettings = Preset.e16(precedence, allowIn),
                exprJs = exprToJs($expr.left, operandGenSettings);

            parenthesize |= op === 'in' && !allowIn;

            if (parenthesize)
                _.js += '(';

            // 0x2F = '/'
            if (exprJs.charCodeAt(exprJs.length - 1) === 0x2F && isIdentifierCh(op.charCodeAt(0)))
                exprJs = exprJs + _.space + op;

            else
                exprJs = join(exprJs, op);

            operandGenSettings.precedence++;

            var rightJs = exprToJs($expr.right, operandGenSettings);

            //NOTE: If '/' concats with '/' or `<` concats with `!--`, it is interpreted as comment start
            if (op === '/' && rightJs.charAt(0) === '/' || op.slice(-1) === '<' && rightJs.slice(0, 3) === '!--')
                exprJs += _.space + rightJs;

            else
                exprJs = join(exprJs, rightJs);

            _.js += exprJs;

            if (parenthesize)
                _.js += ')';
        }

        function generateArrayPatternOrExpression($expr) {
            var $elems = $expr.elements,
                elemCount = $elems.length;

            if (elemCount) {
                var lastElemIdx = elemCount - 1,
                    multiline = elemCount > 1,
                    prevIndent = shiftIndent(),
                    itemPrefix = _.newline + _.indent;

                _.js += '[';

                for (var i = 0; i < elemCount; i++) {
                    var $elem = $elems[i];

                    if (multiline)
                        _.js += itemPrefix;

                    if ($elem)
                        ExprGen[$elem.type]($elem, Preset.e4);

                    if (i !== lastElemIdx || !$elem)
                        _.js += ',';
                }

                _.indent = prevIndent;

                if (multiline)
                    _.js += _.newline + _.indent;

                _.js += ']';
            }

            else
                _.js += '[]';
        }

        function generateImportOrExportSpecifier($expr) {
            _.js += $expr.id.name;

            if ($expr.name)
                _.js += _.space + 'as' + _.space + $expr.name.name;
        }

        function generateGeneratorOrComprehensionExpression($expr) {
            //NOTE: GeneratorExpression should be parenthesized with (...), ComprehensionExpression with [...]
            var $blocks = $expr.blocks,
                $filter = $expr.filter,
                isGenerator = $expr.type === Syntax.GeneratorExpression,
                exprJs = isGenerator ? '(' : '[',
                bodyJs = exprToJs($expr.body, Preset.e4);

            if ($blocks) {
                var prevIndent = shiftIndent(),
                    blockCount = $blocks.length;

                for (var i = 0; i < blockCount; ++i) {
                    var blockJs = exprToJs($blocks[i], Preset.e5);

                    exprJs = i > 0 ? join(exprJs, blockJs) : (exprJs + blockJs);
                }

                _.indent = prevIndent;
            }

            if ($filter) {
                var filterJs = exprToJs($filter, Preset.e5);

                exprJs = join(exprJs, 'if' + _.optSpace);
                exprJs = join(exprJs, '(' + filterJs + ')');
            }

            exprJs = join(exprJs, bodyJs);
            exprJs += isGenerator ? ')' : ']';

            _.js += exprJs;
        }


        //Expression raw generator dictionary
        var ExprRawGen = {
            SequenceExpression: function generateSequenceExpression($expr, settings) {
                var $children = $expr.expressions,
                    childrenCount = $children.length,
                    lastChildIdx = childrenCount - 1,
                    parenthesize = Precedence.Sequence < settings.precedence,
                    exprGenSettings = Preset.e1(settings.allowIn || parenthesize);

                if (parenthesize)
                    _.js += '(';

                for (var i = 0; i < childrenCount; i++) {
                    var $child = $children[i];

                    ExprGen[$child.type]($child, exprGenSettings);

                    if (i !== lastChildIdx)
                        _.js += ',' + _.optSpace;
                }

                if (parenthesize)
                    _.js += ')';
            },

            AssignmentExpression: function generateAssignmentExpression($expr, settings) {
                var $left = $expr.left,
                    $right = $expr.right,
                    parenthesize = Precedence.Assignment < settings.precedence,
                    allowIn = settings.allowIn || parenthesize;

                if (parenthesize)
                    _.js += '(';

                ExprGen[$left.type]($left, Preset.e17(allowIn));
                _.js += _.optSpace + $expr.operator + _.optSpace;
                ExprGen[$right.type]($right, Preset.e18(allowIn));

                if (parenthesize)
                    _.js += ')';
            },

            ArrowFunctionExpression: function generateArrowFunctionExpression($expr, settings) {
                var parenthesize = Precedence.ArrowFunction < settings.precedence;

                if (parenthesize)
                    _.js += '(';

                generateFunctionBody($expr);

                if (parenthesize)
                    _.js += ')';
            },

            ConditionalExpression: function generateConditionalExpression($expr, settings) {
                var $test = $expr.test,
                    $conseq = $expr.consequent,
                    $alt = $expr.alternate,
                    parenthesize = Precedence.Conditional < settings.precedence,
                    allowIn = settings.allowIn || parenthesize,
                    testGenSettings = Preset.e2(allowIn),
                    branchGenSettings = Preset.e1(allowIn);

                if (parenthesize)
                    _.js += '(';

                ExprGen[$test.type]($test, testGenSettings);
                _.js += _.optSpace + '?' + _.optSpace;
                ExprGen[$conseq.type]($conseq, branchGenSettings);
                _.js += _.optSpace + ':' + _.optSpace;
                ExprGen[$alt.type]($alt, branchGenSettings);

                if (parenthesize)
                    _.js += ')';
            },

            LogicalExpression: generateLogicalOrBinaryExpression,

            BinaryExpression: generateLogicalOrBinaryExpression,

            CallExpression: function generateCallExpression($expr, settings) {
                var $callee = $expr.callee,
                    $args = $expr['arguments'],
                    argCount = $args.length,
                    lastArgIdx = argCount - 1,
                    parenthesize = !settings.allowCall || Precedence.Call < settings.precedence;

                if (parenthesize)
                    _.js += '(';

                ExprGen[$callee.type]($callee, Preset.e3);
                _.js += '(';

                for (var i = 0; i < argCount; ++i) {
                    var $arg = $args[i];

                    ExprGen[$arg.type]($arg, Preset.e4);

                    if (i !== lastArgIdx)
                        _.js += ',' + _.optSpace;
                }

                _.js += ')';

                if (parenthesize)
                    _.js += ')';
            },

            NewExpression: function generateNewExpression($expr, settings) {
                var $args = $expr['arguments'],
                    parenthesize = Precedence.New < settings.precedence,
                    argCount = $args.length,
                    lastArgIdx = argCount - 1,
                    withCall = !settings.allowUnparenthesizedNew || parentheses || argCount > 0,
                    calleeJs = exprToJs($expr.callee, Preset.e6(!withCall));

                if (parenthesize)
                    _.js += '(';

                _.js += join('new', calleeJs);

                if (withCall) {
                    _.js += '(';

                    for (var i = 0; i < argCount; ++i) {
                        var $arg = $args[i];

                        ExprGen[$arg.type]($arg, Preset.e4);

                        if (i !== lastArgIdx)
                            _.js += ',' + _.optSpace;
                    }

                    _.js += ')';
                }

                if (parenthesize)
                    _.js += ')';
            },

            MemberExpression: function generateMemberExpression($expr, settings) {
                var $obj = $expr.object,
                    $prop = $expr.property,
                    parenthesize = Precedence.Member < settings.precedence,
                    isNumObj = !$expr.computed && $obj.type === Syntax.Literal && typeof $obj.value === 'number';

                if (parenthesize)
                    _.js += '(';

                if (isNumObj) {

                    //NOTE: When the following conditions are all true:
                    //   1. No floating point
                    //   2. Don't have exponents
                    //   3. The last character is a decimal digit
                    //   4. Not hexadecimal OR octal number literal
                    // then we should add a floating point.

                    var numJs = exprToJs($obj, Preset.e11(settings.allowCall)),
                        withPoint = LAST_DECIMAL_DIGIT_REGEXP.test(numJs) && !FLOATING_OR_OCTAL_REGEXP.test(numJs);

                    _.js += withPoint ? (numJs + '.') : numJs;
                }

                else
                    ExprGen[$obj.type]($obj, Preset.e11(settings.allowCall));

                if ($expr.computed) {
                    _.js += '[';
                    ExprGen[$prop.type]($prop, Preset.e15(settings.allowCall));
                    _.js += ']';
                }

                else
                    _.js += '.' + $prop.name;

                if (parenthesize)
                    _.js += ')';
            },

            UnaryExpression: function generateUnaryExpression($expr, settings) {
                var parenthesize = Precedence.Unary < settings.precedence,
                    op = $expr.operator,
                    argJs = exprToJs($expr.argument, Preset.e7);

                if (parenthesize)
                    _.js += '(';

                //NOTE: delete, void, typeof
                // get `typeof []`, not `typeof[]`
                if (_.optSpace === '' || op.length > 2)
                    _.js += join(op, argJs);

                else {
                    _.js += op;

                    //NOTE: Prevent inserting spaces between operator and argument if it is unnecessary
                    // like, `!cond`
                    var leftCp = op.charCodeAt(op.length - 1),
                        rightCp = argJs.charCodeAt(0);

                    // 0x2B = '+', 0x2D =  '-'
                    if (leftCp === rightCp && (leftCp === 0x2B || leftCp === 0x2D) ||
                        isIdentifierCh(leftCp) && isIdentifierCh(rightCp)) {
                        _.js += _.space;
                    }

                    _.js += argJs;
                }

                if (parenthesize)
                    _.js += ')';
            },

            YieldExpression: function generateYieldExpression($expr, settings) {
                var $arg = $expr.argument,
                    js = $expr.delegate ? 'yield*' : 'yield',
                    parenthesize = Precedence.Yield < settings.precedence;

                if (parenthesize)
                    _.js += '(';

                if ($arg) {
                    var argJs = exprToJs($arg, Preset.e4);

                    js = join(js, argJs);
                }

                _.js += js;

                if (parenthesize)
                    _.js += ')';
            },

            UpdateExpression: function generateUpdateExpression($expr, settings) {
                var $arg = $expr.argument,
                    $op = $expr.operator,
                    prefix = $expr.prefix,
                    precedence = prefix ? Precedence.Unary : Precedence.Postfix,
                    parenthesize = precedence < settings.precedence;

                if (parenthesize)
                    _.js += '(';

                if (prefix) {
                    _.js += $op;
                    ExprGen[$arg.type]($arg, Preset.e8);

                }

                else {
                    ExprGen[$arg.type]($arg, Preset.e8);
                    _.js += $op;
                }

                if (parenthesize)
                    _.js += ')';
            },

            FunctionExpression: function generateFunctionExpression($expr) {
                var isGenerator = !!$expr.generator;

                _.js += isGenerator ? 'function*' : 'function';

                if ($expr.id) {
                    _.js += isGenerator ? _.optSpace : _.space;
                    _.js += $expr.id.name;
                }
                else
                    _.js += _.optSpace;

                generateFunctionBody($expr);
            },

            ExportBatchSpecifier: function generateExportBatchSpecifier() {
                _.js += '*';
            },

            ArrayPattern: generateArrayPatternOrExpression,

            ArrayExpression: generateArrayPatternOrExpression,

            ClassExpression: function generateClassExpression($expr) {
                var $id = $expr.id,
                    $super = $expr.superClass,
                    $body = $expr.body,
                    exprJs = 'class';

                if ($id) {
                    var idJs = exprToJs($id, Preset.e9);

                    exprJs = join(exprJs, idJs);
                }

                if ($super) {
                    var superJs = exprToJs($super, Preset.e4);

                    superJs = join('extends', superJs);
                    exprJs = join(exprJs, superJs);
                }

                _.js += exprJs + _.optSpace;
                StmtGen[$body.type]($body, Preset.s2);
            },

            MethodDefinition: function generateMethodDefinition($expr) {
                var exprJs = $expr['static'] ? 'static' + _.optSpace : '',
                    keyJs = exprToJs($expr.key, Preset.e5);

                if ($expr.computed)
                    keyJs = '[' + keyJs + ']';

                if ($expr.kind === 'get' || $expr.kind === 'set') {
                    keyJs = join($expr.kind, keyJs);
                    _.js += join(exprJs, keyJs);
                }

                else {
                    if ($expr.value.generator)
                        _.js += exprJs + '*' + keyJs;

                    else
                        _.js += join(exprJs, keyJs);
                }

                generateFunctionBody($expr.value);
            },

            Property: function generateProperty($expr) {
                var $val = $expr.value,
                    $kind = $expr.kind,
                    keyJs = exprToJs($expr.key, Preset.e5);

                if ($expr.computed)
                    keyJs = '[' + keyJs + ']';

                if ($kind === 'get' || $kind === 'set') {
                    _.js += $kind + _.space + keyJs;
                    generateFunctionBody($val);
                }

                else {
                    if ($expr.shorthand)
                        _.js += keyJs;

                    else if ($expr.method) {
                        _.js += $val.generator ? ('*' + keyJs) : keyJs;
                        generateFunctionBody($val)
                    }

                    else {
                        _.js += keyJs + ':' + _.optSpace;
                        ExprGen[$val.type]($val, Preset.e4);
                    }
                }
            },

            ObjectExpression: function generateObjectExpression($expr) {
                var $props = $expr.properties,
                    propCount = $props.length;

                if (propCount) {
                    var lastPropIdx = propCount - 1,
                        prevIndent = shiftIndent();

                    _.js += '{';

                    for (var i = 0; i < propCount; i++) {
                        var $prop = $props[i],
                            propType = $prop.type || Syntax.Property;

                        _.js += _.newline + _.indent;
                        ExprGen[propType]($prop, Preset.e5);

                        if (i !== lastPropIdx)
                            _.js += ',';
                    }

                    _.indent = prevIndent;
                    _.js += _.newline + _.indent + '}';
                }

                else
                    _.js += '{}';
            },

            ObjectPattern: function generateObjectPattern($expr) {
                var $props = $expr.properties,
                    propCount = $props.length;

                if (propCount) {
                    var lastPropIdx = propCount - 1,
                        multiline = false;

                    if (propCount === 1)
                        multiline = $props[0].value.type !== Syntax.Identifier;

                    else {
                        for (var i = 0; i < propCount; i++) {
                            if (!$props[i].shorthand) {
                                multiline = true;
                                break;
                            }
                        }
                    }

                    _.js += multiline ? ('{' + _.newline) : '{';

                    var prevIndent = shiftIndent(),
                        propSuffix = ',' + (multiline ? _.newline : _.optSpace);

                    for (var i = 0; i < propCount; i++) {
                        var $prop = $props[i];

                        if (multiline)
                            _.js += _.indent;

                        ExprGen[$prop.type]($prop, Preset.e5);

                        if (i !== lastPropIdx)
                            _.js += propSuffix;
                    }

                    _.indent = prevIndent;
                    _.js += multiline ? (_.newline + _.indent + '}') : '}';
                }
                else
                    _.js += '{}';
            },

            ThisExpression: function generateThisExpression() {
                _.js += 'this';
            },

            Identifier: function generateIdentifier($expr) {
                _.js += $expr.name;
            },

            ImportSpecifier: generateImportOrExportSpecifier,

            ExportSpecifier: generateImportOrExportSpecifier,

            Literal: function generateLiteral($expr) {
                if (extra.raw && $expr.raw !== void 0)
                    _.js += $expr.raw;

                else if ($expr.value === null)
                    _.js += 'null';

                else {
                    var valueType = typeof $expr.value;

                    if (valueType === 'string')
                        _.js += escapeString($expr.value);

                    else if (valueType === 'number')
                        _.js += generateNumber($expr.value);

                    else if (valueType === 'boolean')
                        _.js += $expr.value ? 'true' : 'false';

                    else
                        _.js += generateRegExp($expr.value);
                }
            },

            GeneratorExpression: generateGeneratorOrComprehensionExpression,

            ComprehensionExpression: generateGeneratorOrComprehensionExpression,

            ComprehensionBlock: function generateComprehensionBlock($expr) {
                var $left = $expr.left,
                    leftJs = void 0,
                    rightJs = exprToJs($expr.right, Preset.e5);

                if ($left.type === Syntax.VariableDeclaration)
                    leftJs = $left.kind + _.space + stmtToJs($left.declarations[0], Preset.s6);

                else
                    leftJs = exprToJs($left, Preset.e10);

                leftJs = join(leftJs, $expr.of ? 'of' : 'in');

                _.js += 'for' + _.optSpace + '(' + join(leftJs, rightJs) + ')';
            },

            SpreadElement: function generateSpreadElement($expr) {
                var $arg = $expr.argument;

                _.js += '...';
                ExprGen[$arg.type]($arg, Preset.e4);
            },

            TaggedTemplateExpression: function generateTaggedTemplateExpression($expr, settings) {
                var $tag = $expr.tag,
                    $quasi = $expr.quasi,
                    parenthesize = Precedence.TaggedTemplate < settings.precedence;

                if (parenthesize)
                    _.js += '(';

                ExprGen[$tag.type]($tag, Preset.e11(settings.allowCall));
                ExprGen[$quasi.type]($quasi, Preset.e12);

                if (parenthesize)
                    _.js += ')';
            },

            TemplateElement: function generateTemplateElement($expr) {
                //NOTE: Don't use "cooked". Since tagged template can use raw template
                // representation. So if we do so, it breaks the script semantics.
                _.js += $expr.value.raw;
            },

            TemplateLiteral: function generateTemplateLiteral($expr) {
                var $quasis = $expr.quasis,
                    $childExprs = $expr.expressions,
                    quasiCount = $quasis.length,
                    lastQuasiIdx = quasiCount - 1;

                _.js += '`';

                for (var i = 0; i < quasiCount; ++i) {
                    var $quasi = $quasis[i];

                    ExprGen[$quasi.type]($quasi, Preset.e13);

                    if (i !== lastQuasiIdx) {
                        var $childExpr = $childExprs[i];

                        _.js += '${' + _.optSpace;
                        ExprGen[$childExpr.type]($childExpr, Preset.e5);
                        _.js += _.optSpace + '}';
                    }
                }

                _.js += '`';
            }
        };


        //-------------------------------------------------===------------------------------------------------------
        //                                              Statements
        //-------------------------------------------------===------------------------------------------------------


        //Regular expressions
        var EXPR_STMT_UNALLOWED_EXPR_REGEXP = /^{|^class(?:\s|{)|^function(?:\s|\*|\()/;


        //Common statement generators
        function generateTryStatementHandlers(stmtJs, $finalizer, handlers) {
            var handlerCount = handlers.length,
                lastHandlerIdx = handlerCount - 1;

            for (var i = 0; i < handlerCount; ++i) {
                var handlerJs = stmtToJs(handlers[i], Preset.s7);

                stmtJs = join(stmtJs, handlerJs);

                if ($finalizer || i !== lastHandlerIdx)
                    stmtJs += adoptionSuffix(handlers[i].body);
            }

            return stmtJs;
        }

        function generateForStatementIterator($op, $stmt, settings) {
            var $body = $stmt.body,
                $left = $stmt.left,
                bodySemicolonOptional = !semicolons && settings.semicolonOptional,
                prevIndent1 = shiftIndent(),
                stmtJs = 'for' + _.optSpace + '(';

            if ($left.type === Syntax.VariableDeclaration) {
                var prevIndent2 = shiftIndent();

                stmtJs += $left.kind + _.space + stmtToJs($left.declarations[0], Preset.s6);
                _.indent = prevIndent2;
            }

            else
                stmtJs += exprToJs($left, Preset.e10);

            stmtJs = join(stmtJs, $op);

            var rightJs = exprToJs($stmt.right, Preset.e5);

            stmtJs = join(stmtJs, rightJs) + ')';

            _.indent = prevIndent1;

            _.js += stmtJs + adoptionPrefix($body);
            StmtGen[$body.type]($body, Preset.s4(bodySemicolonOptional));
        }


        //Statement generator dictionary
        var StmtRawGen = {
            BlockStatement: function generateBlockStatement($stmt, settings) {
                var $body = $stmt.body,
                    len = $body.length,
                    lastIdx = len - 1,
                    prevIndent = shiftIndent();

                _.js += '{' + _.newline;

                //NOTE: extremely stupid solution for the T170848. We can't preserver all comments, because it's
                //ultra slow, but we make a trick: if we have a function body without content then we add
                //empty block comment into it. A lot of popular sites uses this ads library which fails if we don't
                //do that.
                if (settings.functionBody && !$body.length)
                    _.js += '/**/';

                for (var i = 0; i < len; i++) {
                    var $item = $body[i];

                    _.js += _.indent;
                    StmtGen[$item.type]($item, Preset.s1(settings.functionBody, i === lastIdx));
                    _.js += _.newline;
                }

                _.indent = prevIndent;
                _.js += _.indent + '}';
            },

            BreakStatement: function generateBreakStatement($stmt, settings) {
                if ($stmt.label)
                    _.js += 'break ' + $stmt.label.name;

                else
                    _.js += 'break';

                if (semicolons || !settings.semicolonOptional)
                    _.js += ';';
            },

            ContinueStatement: function generateContinueStatement($stmt, settings) {
                if ($stmt.label)
                    _.js += 'continue ' + $stmt.label.name;

                else
                    _.js += 'continue';

                if (semicolons || !settings.semicolonOptional)
                    _.js += ';';
            },

            ClassBody: function generateClassBody($stmt) {
                var $body = $stmt.body,
                    itemCount = $body.length,
                    lastItemIdx = itemCount - 1,
                    prevIndent = shiftIndent();

                _.js += '{' + _.newline;

                for (var i = 0; i < itemCount; i++) {
                    var $item = $body[i],
                        itemType = $item.type || Syntax.Property;

                    _.js += _.indent;
                    ExprGen[itemType]($item, Preset.e5);

                    if (i !== lastItemIdx)
                        _.js += _.newline;
                }

                _.indent = prevIndent;
                _.js += _.newline + _.indent + '}';
            },

            ClassDeclaration: function generateClassDeclaration($stmt) {
                var $body = $stmt.body,
                    $super = $stmt.superClass,
                    js = 'class ' + $stmt.id.name;

                if ($super) {
                    var superJs = exprToJs($super, Preset.e4);

                    js += _.space + join('extends', superJs);
                }

                _.js += js + _.optSpace;
                StmtGen[$body.type]($body, Preset.s2);
            },

            DirectiveStatement: function generateDirectiveStatement($stmt, settings) {
                if (extra.raw && $stmt.raw)
                    _.js += $stmt.raw;

                else
                    _.js += escapeDirective($stmt.directive);

                if (semicolons || !settings.semicolonOptional)
                    _.js += ';';
            },

            DoWhileStatement: function generateDoWhileStatement($stmt, settings) {
                var $body = $stmt.body,
                    $test = $stmt.test,
                    bodyJs = adoptionPrefix($body) +
                             stmtToJs($body, Preset.s7) +
                             adoptionSuffix($body);

                //NOTE: Because `do 42 while (cond)` is Syntax Error. We need semicolon.
                var stmtJs = join('do', bodyJs);

                _.js += join(stmtJs, 'while' + _.optSpace + '(');
                ExprGen[$test.type]($test, Preset.e5);
                _.js += ')';

                if (semicolons || !settings.semicolonOptional)
                    _.js += ';';
            },

            CatchClause: function generateCatchClause($stmt) {
                var $param = $stmt.param,
                    $guard = $stmt.guard,
                    $body = $stmt.body,
                    prevIndent = shiftIndent();

                _.js += 'catch' + _.optSpace + '(';
                ExprGen[$param.type]($param, Preset.e5);

                if ($guard) {
                    _.js += ' if ';
                    ExprGen[$guard.type]($guard, Preset.e5);
                }

                _.indent = prevIndent;
                _.js += ')' + adoptionPrefix($body);
                StmtGen[$body.type]($body, Preset.s7);
            },

            DebuggerStatement: function generateDebuggerStatement($stmt, settings) {
                _.js += 'debugger';

                if (semicolons || !settings.semicolonOptional)
                    _.js += ';';
            },

            EmptyStatement: function generateEmptyStatement() {
                _.js += ';';
            },

            ExportDeclaration: function generateExportDeclaration($stmt, settings) {
                var $specs = $stmt.specifiers,
                    $decl = $stmt.declaration,
                    withSemicolon = semicolons || !settings.semicolonOptional;

                // export default AssignmentExpression[In] ;
                if ($stmt['default']) {
                    var declJs = exprToJs($decl, Preset.e4);

                    _.js += join('export default', declJs);

                    if (withSemicolon)
                        _.js += ';';
                }

                // export * FromClause ;
                // export ExportClause[NoReference] FromClause ;
                // export ExportClause ;
                else if ($specs) {
                    var stmtJs = 'export';

                    if ($specs.length === 0)
                        stmtJs += _.optSpace + '{' + _.optSpace + '}';

                    else if ($specs[0].type === Syntax.ExportBatchSpecifier) {
                        var specJs = exprToJs($specs[0], Preset.e5);

                        stmtJs = join(stmtJs, specJs);
                    }

                    else {
                        var prevIndent = shiftIndent(),
                            specCount = $specs.length,
                            lastSpecIdx = specCount - 1;

                        stmtJs += _.optSpace + '{';

                        for (var i = 0; i < specCount; ++i) {
                            stmtJs += _.newline + _.indent;
                            stmtJs += exprToJs($specs[i], Preset.e5);

                            if (i !== lastSpecIdx)
                                stmtJs += ',';
                        }

                        _.indent = prevIndent;
                        stmtJs += _.newline + _.indent + '}';
                    }

                    if ($stmt.source) {
                        _.js += join(stmtJs, 'from' + _.optSpace);
                        ExprGen.Literal($stmt.source);
                    }

                    else
                        _.js += stmtJs;

                    if (withSemicolon)
                        _.js += ';';
                }

                // export VariableStatement
                // export Declaration[Default]
                else if ($decl) {
                    var declJs = stmtToJs($decl, Preset.s4(!withSemicolon));

                    _.js += join('export', declJs);
                }
            },

            ExpressionStatement: function generateExpressionStatement($stmt, settings) {
                var exprJs = exprToJs($stmt.expression, Preset.e5),
                    parenthesize = EXPR_STMT_UNALLOWED_EXPR_REGEXP.test(exprJs) ||
                                   (directive &&
                                    settings.directiveContext &&
                                    $stmt.expression.type === Syntax.Literal &&
                                    typeof $stmt.expression.value === 'string');

                //NOTE: '{', 'function', 'class' are not allowed in expression statement.
                // Therefore, they should be parenthesized.
                if (parenthesize)
                    _.js += '(' + exprJs + ')';

                else
                    _.js += exprJs;

                if (semicolons || !settings.semicolonOptional)
                    _.js += ';';
            },

            ImportDeclaration: function generateImportDeclaration($stmt, settings) {
                var $specs = $stmt.specifiers,
                    stmtJs = 'import',
                    specCount = $specs.length;

                //NOTE: If no ImportClause is present,
                // this should be `import ModuleSpecifier` so skip `from`
                // ModuleSpecifier is StringLiteral.
                if (specCount) {
                    var hasBinding = !!$specs[0]['default'],
                        firstNamedIdx = hasBinding ? 1 : 0,
                        lastSpecIdx = specCount - 1;

                    // ImportedBinding
                    if (hasBinding)
                        stmtJs = join(stmtJs, $specs[0].id.name);

                    // NamedImports
                    if (firstNamedIdx < specCount) {
                        if (hasBinding)
                            stmtJs += ',';

                        stmtJs += _.optSpace + '{';

                        // import { ... } from "...";
                        if (firstNamedIdx === lastSpecIdx)
                            stmtJs += _.optSpace + exprToJs($specs[firstNamedIdx], Preset.e5) + _.optSpace;

                        else {
                            var prevIndent = shiftIndent();

                            // import {
                            //    ...,
                            //    ...,
                            // } from "...";
                            for (var i = firstNamedIdx; i < specCount; i++) {
                                stmtJs += _.newline + _.indent + exprToJs($specs[i], Preset.e5);

                                if (i !== lastSpecIdx)
                                    stmtJs += ',';
                            }

                            _.indent = prevIndent;
                            stmtJs += _.newline + _.indent;
                        }

                        stmtJs += '}' + _.optSpace;
                    }

                    stmtJs = join(stmtJs, 'from')
                }

                _.js += stmtJs + _.optSpace;
                ExprGen.Literal($stmt.source);

                if (semicolons || !settings.semicolonOptional)
                    _.js += ';';
            },

            VariableDeclarator: function generateVariableDeclarator($stmt, settings) {
                var $id = $stmt.id,
                    $init = $stmt.init,
                    genSettings = Preset.e1(settings.allowIn);

                if ($init) {
                    ExprGen[$id.type]($id, genSettings);
                    _.js += _.optSpace + '=' + _.optSpace;
                    ExprGen[$init.type]($init, genSettings);
                }

                else {
                    if ($id.type === Syntax.Identifier)
                        _.js += $id.name;

                    else
                        ExprGen[$id.type]($id, genSettings);
                }
            },

            VariableDeclaration: function generateVariableDeclaration($stmt, settings) {
                var $decls = $stmt.declarations,
                    len = $decls.length,
                    prevIndent = len > 1 ? shiftIndent() : _.indent,
                    declGenSettings = Preset.s3(settings.allowIn);

                _.js += $stmt.kind;

                for (var i = 0; i < len; i++) {
                    var $decl = $decls[i];

                    _.js += i === 0 ? _.space : (',' + _.optSpace);
                    StmtGen[$decl.type]($decl, declGenSettings);
                }

                if (semicolons || !settings.semicolonOptional)
                    _.js += ';';

                _.indent = prevIndent;
            },

            ThrowStatement: function generateThrowStatement($stmt, settings) {
                var argJs = exprToJs($stmt.argument, Preset.e5);

                _.js += join('throw', argJs);

                if (semicolons || !settings.semicolonOptional)
                    _.js += ';';
            },

            TryStatement: function generateTryStatement($stmt) {
                var $block = $stmt.block,
                    $finalizer = $stmt.finalizer,
                    stmtJs = 'try' +
                             adoptionPrefix($block) +
                             stmtToJs($block, Preset.s7) +
                             adoptionSuffix($block);

                var $handlers = $stmt.handlers || $stmt.guardedHandlers;

                if ($handlers)
                    stmtJs = generateTryStatementHandlers(stmtJs, $finalizer, $handlers);

                if ($stmt.handler) {
                    $handlers = isArray($stmt.handler) ? $stmt.handler : [$stmt.handler];
                    stmtJs = generateTryStatementHandlers(stmtJs, $finalizer, $handlers);
                }

                if ($finalizer) {
                    stmtJs = join(stmtJs, 'finally' + adoptionPrefix($finalizer));
                    stmtJs += stmtToJs($finalizer, Preset.s7);
                }

                _.js += stmtJs;
            },

            SwitchStatement: function generateSwitchStatement($stmt) {
                var $cases = $stmt.cases,
                    $discr = $stmt.discriminant,
                    prevIndent = shiftIndent();

                _.js += 'switch' + _.optSpace + '(';
                ExprGen[$discr.type]($discr, Preset.e5);
                _.js += ')' + _.optSpace + '{' + _.newline;
                _.indent = prevIndent;

                if ($cases) {
                    var caseCount = $cases.length,
                        lastCaseIdx = caseCount - 1;

                    for (var i = 0; i < caseCount; i++) {
                        var $case = $cases[i];

                        _.js += _.indent;
                        StmtGen[$case.type]($case, Preset.s4(i === lastCaseIdx));
                        _.js += _.newline;
                    }
                }

                _.js += _.indent + '}';
            },

            SwitchCase: function generateSwitchCase($stmt, settings) {
                var $conseqs = $stmt.consequent,
                    $firstConseq = $conseqs[0],
                    $test = $stmt.test,
                    i = 0,
                    conseqSemicolonOptional = !semicolons && settings.semicolonOptional,
                    conseqCount = $conseqs.length,
                    lastConseqIdx = conseqCount - 1,
                    prevIndent = shiftIndent();

                if ($test) {
                    var testJs = exprToJs($test, Preset.e5);

                    _.js += join('case', testJs) + ':';
                }

                else
                    _.js += 'default:';


                if (conseqCount && $firstConseq.type === Syntax.BlockStatement) {
                    i++;
                    _.js += adoptionPrefix($firstConseq);
                    StmtGen[$firstConseq.type]($firstConseq, Preset.s7);
                }

                for (; i < conseqCount; i++) {
                    var $conseq = $conseqs[i],
                        semicolonOptional = i === lastConseqIdx && conseqSemicolonOptional;

                    _.js += _.newline + _.indent;
                    StmtGen[$conseq.type]($conseq, Preset.s4(semicolonOptional));
                }

                _.indent = prevIndent;
            },

            IfStatement: function generateIfStatement($stmt, settings) {
                var $conseq = $stmt.consequent,
                    $test = $stmt.test,
                    prevIndent = shiftIndent(),
                    semicolonOptional = !semicolons && settings.semicolonOptional;

                _.js += 'if' + _.optSpace + '(';
                ExprGen[$test.type]($test, Preset.e5);
                _.js += ')';
                _.indent = prevIndent;
                _.js += adoptionPrefix($conseq);

                if ($stmt.alternate) {
                    var conseq = stmtToJs($conseq, Preset.s7) + adoptionSuffix($conseq),
                        alt = stmtToJs($stmt.alternate, Preset.s4(semicolonOptional));

                    if ($stmt.alternate.type === Syntax.IfStatement)
                        alt = 'else ' + alt;

                    else
                        alt = join('else', adoptionPrefix($stmt.alternate) + alt);

                    _.js += join(conseq, alt);
                }

                else
                    StmtGen[$conseq.type]($conseq, Preset.s4(semicolonOptional));
            },

            ForStatement: function generateForStatement($stmt, settings) {
                var $init = $stmt.init,
                    $test = $stmt.test,
                    $body = $stmt.body,
                    $update = $stmt.update,
                    bodySemicolonOptional = !semicolons && settings.semicolonOptional,
                    prevIndent = shiftIndent();

                _.js += 'for' + _.optSpace + '(';

                if ($init) {
                    if ($init.type === Syntax.VariableDeclaration)
                        StmtGen[$init.type]($init, Preset.s6);

                    else {
                        ExprGen[$init.type]($init, Preset.e14);
                        _.js += ';';
                    }
                }

                else
                    _.js += ';';

                if ($test) {
                    _.js += _.optSpace;
                    ExprGen[$test.type]($test, Preset.e5);
                }

                _.js += ';';

                if ($update) {
                    _.js += _.optSpace;
                    ExprGen[$update.type]($update, Preset.e5);
                }

                _.js += ')';
                _.indent = prevIndent;
                _.js += adoptionPrefix($body);
                StmtGen[$body.type]($body, Preset.s4(bodySemicolonOptional));
            },

            ForInStatement: function generateForInStatement($stmt, settings) {
                generateForStatementIterator('in', $stmt, settings);
            },

            ForOfStatement: function generateForOfStatement($stmt, settings) {
                generateForStatementIterator('of', $stmt, settings);
            },

            LabeledStatement: function generateLabeledStatement($stmt, settings) {
                var $body = $stmt.body,
                    bodySemicolonOptional = !semicolons && settings.semicolonOptional,
                    prevIndent = _.indent;

                _.js += $stmt.label.name + ':' + adoptionPrefix($body);

                if ($body.type !== Syntax.BlockStatement)
                    prevIndent = shiftIndent();

                StmtGen[$body.type]($body, Preset.s4(bodySemicolonOptional));
                _.indent = prevIndent;
            },

            ModuleDeclaration: function generateModuleDeclaration($stmt, settings) {
                _.js += 'module' + _.space + $stmt.id.name + _.space + 'from' + _.optSpace;

                ExprGen.Literal($stmt.source);

                if (semicolons || !settings.semicolonOptional)
                    _.js += ';';
            },

            Program: function generateProgram($stmt) {
                var $body = $stmt.body,
                    len = $body.length,
                    lastIdx = len - 1;

                if (safeConcatenation && len > 0)
                    _.js += '\n';

                for (var i = 0; i < len; i++) {
                    var $item = $body[i];

                    _.js += _.indent;
                    StmtGen[$item.type]($item, Preset.s5(!safeConcatenation && i === lastIdx));

                    if (i !== lastIdx)
                        _.js += _.newline;
                }
            },

            FunctionDeclaration: function generateFunctionDeclaration($stmt) {
                var isGenerator = !!$stmt.generator;

                _.js += isGenerator ? ('function*' + _.optSpace) : ('function' + _.space );
                _.js += $stmt.id.name;
                generateFunctionBody($stmt);
            },

            ReturnStatement: function generateReturnStatement($stmt, settings) {
                var $arg = $stmt.argument;

                if ($arg) {
                    var argJs = exprToJs($arg, Preset.e5);

                    _.js += join('return', argJs);
                }

                else
                    _.js += 'return';

                if (semicolons || !settings.semicolonOptional)
                    _.js += ';';
            },

            WhileStatement: function generateWhileStatement($stmt, settings) {
                var $body = $stmt.body,
                    $test = $stmt.test,
                    bodySemicolonOptional = !semicolons && settings.semicolonOptional,
                    prevIndent = shiftIndent();

                _.js += 'while' + _.optSpace + '(';
                ExprGen[$test.type]($test, Preset.e5);
                _.js += ')';
                _.indent = prevIndent;

                _.js += adoptionPrefix($body);
                StmtGen[$body.type]($body, Preset.s4(bodySemicolonOptional));
            },

            WithStatement: function generateWithStatement($stmt, settings) {
                var $body = $stmt.body,
                    $obj = $stmt.object,
                    bodySemicolonOptional = !semicolons && settings.semicolonOptional,
                    prevIndent = shiftIndent();

                _.js += 'with' + _.optSpace + '(';
                ExprGen[$obj.type]($obj, Preset.e5);
                _.js += ')';
                _.indent = prevIndent;
                _.js += adoptionPrefix($body);
                StmtGen[$body.type]($body, Preset.s4(bodySemicolonOptional));
            }
        };

        function generateStatement($stmt, option) {
            StmtGen[$stmt.type]($stmt, option);
        }

        //CodeGen
        //-----------------------------------------------------------------------------------
        function exprToJs($expr, settings) {
            var savedJs = _.js;
            _.js = '';

            ExprGen[$expr.type]($expr, settings);

            var src = _.js;
            _.js = savedJs;

            return src;
        }

        function stmtToJs($stmt, settings) {
            var savedJs = _.js;
            _.js = '';

            StmtGen[$stmt.type]($stmt, settings);

            var src = _.js;
            _.js = savedJs;

            return src;
        }

        function run($node) {
            _.js = '';

            if (StmtGen[$node.type])
                StmtGen[$node.type]($node, Preset.s7);

            else
                ExprGen[$node.type]($node, Preset.e19);

            return _.js;
        }

        function wrapExprGen(gen) {
            return function ($expr, settings) {
                if (extra.verbatim && $expr.hasOwnProperty(extra.verbatim))
                    generateVerbatim($expr, settings);

                else
                    gen($expr, settings);
            }
        }

        function createExprGenWithExtras() {
            var gens = {};

            for (var key in ExprRawGen) {
                if (ExprRawGen.hasOwnProperty(key))
                    gens[key] = wrapExprGen(ExprRawGen[key]);
            }

            return gens;
        }


        //Strings
        var _ = {
            js: '',
            newline: '\n',
            optSpace: ' ',
            space: ' ',
            indentUnit: '    ',
            indent: ''
        };


        //Generators
        var ExprGen = void 0,
            StmtGen = StmtRawGen;


        function generate($node, options) {
            var defaultOptions = getDefaultOptions(), result, pair;

            if (options != null) {
                //NOTE: Obsolete options
                //
                //   `options.indent`
                //   `options.base`
                //
                // Instead of them, we can use `option.format.indent`.
                if (typeof options.indent === 'string') {
                    defaultOptions.format.indent.style = options.indent;
                }
                if (typeof options.base === 'number') {
                    defaultOptions.format.indent.base = options.base;
                }
                options = updateDeeply(defaultOptions, options);
                _.indentUnit = options.format.indent.style;
                if (typeof options.base === 'string') {
                    _.indent = options.base;
                } else {
                    _.indent = stringRepeat(_.indentUnit, options.format.indent.base);
                }
            } else {
                options = defaultOptions;
                _.indentUnit = options.format.indent.style;
                _.indent = stringRepeat(_.indentUnit, options.format.indent.base);
            }
            json = options.format.json;
            renumber = options.format.renumber;
            hexadecimal = json ? false : options.format.hexadecimal;
            quotes = json ? 'double' : options.format.quotes;
            escapeless = options.format.escapeless;

            _.newline = options.format.newline;
            _.optSpace = options.format.space;

            if (options.format.compact)
                _.newline = _.optSpace = _.indentUnit = _.indent = '';

            _.space = _.optSpace ? _.optSpace : ' ';
            parentheses = options.format.parentheses;
            semicolons = options.format.semicolons;
            safeConcatenation = options.format.safeConcatenation;
            directive = options.directive;
            parse = json ? null : options.parse;
            extra = options;

            if (extra.verbatim)
                ExprGen = createExprGenWithExtras();

            else
                ExprGen = ExprRawGen;

            return run($node);
        }

        FORMAT_MINIFY = {
            indent: {
                style: '',
                base: 0
            },
            renumber: true,
            hexadecimal: true,
            quotes: 'auto',
            escapeless: true,
            compact: true,
            parentheses: false,
            semicolons: false
        };

        FORMAT_DEFAULTS = getDefaultOptions().format;

        exports.generate = generate;
        exports.Precedence = updateDeeply({}, Precedence);
        exports.browser = false;
        exports.FORMAT_MINIFY = FORMAT_MINIFY;
        exports.FORMAT_DEFAULTS = FORMAT_DEFAULTS;

    })(codeGetExports);

    JSParsingTools.generate = codeGetExports.generate;
    // ------------------------------------------

    if (typeof module !== 'undefined' && module.exports)
        module.exports = JSParsingTools;
    else {
        HammerheadClient.define('Shared.JSParsingTools', function () {
            this.exports = JSParsingTools;
        });
    }
})();