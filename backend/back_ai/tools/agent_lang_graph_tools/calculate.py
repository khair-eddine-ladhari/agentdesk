from langchain_core.tools import tool


@tool
def calculate(expression: str) -> str:
    """
    Evaluate a deterministic math expression - e.g. revenue projections,
    percentage changes, totals. Input should be a plain arithmetic
    expression like "49 * 120 * 1.1". Never use this to guess at numbers
    not given to you; only calculate with figures already retrieved from
    docs, web search, or the user's own message.
    """
    try:
        allowed_chars = set("0123456789+-*/(). ")
        if not all(c in allowed_chars for c in expression):
            return "Invalid characters in expression - only numbers and + - * / ( ) allowed."
        return str(eval(expression, {"__builtins__": {}}, {}))
    except Exception as exc:
        return f"Error evaluating expression: {exc}"