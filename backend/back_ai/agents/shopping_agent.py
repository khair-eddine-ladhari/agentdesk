"""
crew.py
-------
Runs product search directly in Python (no LLM agent in the loop for
search), then hands the raw, guaranteed-verbatim results to a single
CrewAI comparator agent that does the actual reasoning (compare +
recommend).

WHY NOT THREE SEARCH AGENTS ANYMORE:
The previous version used a separate LLM agent per store, each with
one tool. The tool calls always worked and always returned real data
— but CrewAI only forwards a task's *Final Answer text* to downstream
tasks via `context`, not the raw tool output. The 8B search model
would intermittently write a lazy Final Answer like "results are
shown above" or "some products match" instead of literally copying
the tool's output — so the comparator would receive near-empty input
for that store and correctly (from its point of view) report "no
data," even though the store actually had real products the whole
time. This was confirmed directly in the CLI trace: tool output was
always populated, but the agent's Final Answer sometimes wasn't.

Since the search step does no reasoning at all (call one tool, relay
its text), there's no reason to route it through an LLM turn that can
drop data. Calling the tools directly in Python removes that failure
mode completely — the comparator now always receives exactly what
SerpApi returned, with no lossy paraphrase step in between.

INTENT CLASSIFICATION (META / EXPLAIN / SEARCH / CHAT):
Before any of the above runs at all, not every incoming message is a
product search. Greetings ("hi"), thanks, small talk, or an
accidentally-submitted UI placeholder string used to be sent straight
to _run_searches() like any real query — SerpApi's Amazon/eBay/Walmart
engines do plain substring/keyword matching, so "hi" happily returned
real (but useless) listings like "HI-CHEW" or "HI-C Orange" instead of
anything indicating the input wasn't a real search. The comparator
agent would eventually notice nothing matched ("Relevant data found:
no"), but only *after* three SerpApi calls and a full LLM comparison
pass had already run — wasted calls, wasted TPM budget, and a junk
table shown to the user before the "no" line explaining it was
pointless.

_classify_intent() fixes this the same way _resolve_query() fixes
follow-ups: a single, cheap, non-agentic LLM call (LLM.call(), not a
CrewAI Agent/Task/Crew — a plain classification doesn't need
role/goal/backstory or task orchestration overhead). It runs
unconditionally at the top of run_product_search(), *before*
_resolve_query(), on the RAW query plus the last prior turn (if any).

It's a four-way classification (META / EXPLAIN / SEARCH / CHAT), not a
plain SEARCH/CHAT binary, because of two separate bugs found in
production, each fixed by carving a new category out of what used to
be lumped into SEARCH:

  1. META vs. SEARCH ordering bug (fixed first): classifying before
     _resolve_query() ran misjudged genuine follow-ups like "are you
     sure" as CHAT (nothing about that phrase alone signals "product
     search"), while classifying after _resolve_query() ran meant a
     question ABOUT the conversation itself — e.g. "do you remember my
     last question" — got rewritten by _resolve_query() into a
     standalone product search first (since that function's whole job
     is turning things into search queries) and then correctly, but
     wrongly, classified as SEARCH. Giving the classifier the prior
     turn as context up front, in one call, lets it recognize META
     questions and genuine SEARCH follow-ups correctly without either
     ordering conflict.

  2. EXPLAIN vs. SEARCH bug (fixed second, observed in production):
     a follow-up like "why is this laptop the best one" was being
     classified as SEARCH (reasonably — it IS a follow-up referring to
     the prior recommendation) and handed to _resolve_query(), whose
     ONLY tool is "rewrite into a new search query." But a "why"
     question about a recommendation that was already justified in the
     prior turn's answer needs no new data at all — the previous
     answer's recommendation paragraph already contains the reasoning.
     _resolve_query() had no way to express "don't search, just quote
     what I already said," so it rewrote "why is this laptop the best
     one" into a keyword search like "2026 HP Laptop Store B review"
     and sent THAT to SerpApi/Amazon/eBay/Walmart — which have no
     "review" content type, so it came back with more product listings
     instead of any reasoning, and the comparator correctly (but
     uselessly) reported "Relevant data found: no" to a question that
     was never answerable by searching in the first place.

     EXPLAIN is the fix: a follow-up asking to justify, elaborate on,
     or explain the reasoning behind the recommendation JUST given is
     answered deterministically straight from the prior turn's answer
     text by _answer_explain_question(), the same way META is answered
     by _answer_meta_question() — no search, no rewrite, no comparator
     LLM call, and therefore no chance of drifting onto a different,
     unrelated product the way the eBay-listing rewrite did. This is
     distinct from a genuine new-attribute follow-up like "is it good
     for gaming" or "which one has better battery life," which SEARCH
     still handles correctly, since those attributes generally aren't
     already sitting in the prior answer and do need a fresh, targeted
     search.

Only SEARCH-classified queries go on to _resolve_query() afterwards.
META and EXPLAIN are both answered directly from `history`,
deterministically (no LLM generation of the answer content, to avoid
paraphrasing/misstating what was actually asked or said before).

Like _resolve_query(), the classifier fails open: if the classifier
call errors (e.g. rate-limited), we default to SEARCH rather than risk
wrongly blocking a real query.

FOLLOW-UP / HISTORY HANDLING:
main.py stores each turn's query+answer in session_state and passes
it back on every request, but the search itself was always run on the
raw current-turn query alone. That meant a follow-up like "which one
has the best battery life" — meant to refer back to the laptops from
the previous turn — got searched literally, returning AA batteries
and car batteries instead of laptop battery life.

_resolve_query() fixes this with a single, cheap, non-agentic LLM
call: given the last turn (query + answer) and the new question, it
either rewrites the new question into a standalone query that names
the single recommended prior product, or returns it unchanged if it
wasn't actually a follow-up. This keeps the fix isolated to one small
step — the store-search tools and the comparator agent are both
otherwise untouched. Note this function is now only reachable for
genuine SEARCH-classified follow-ups — see the EXPLAIN note above for
why "why" questions no longer reach it at all.

BUG FIX (prior-answer truncation): the prior turn's answer text fed
into the rewrite prompt used to be truncated with a plain head-slice,
answer[:_MAX_PRIOR_ANSWER_CHARS]. A full comparator answer is a
multi-row markdown table FOLLOWED BY the "Relevant data found: yes/no"
line and the actual recommendation paragraph — and the table alone
routinely exceeds _MAX_PRIOR_ANSWER_CHARS on its own. That meant the
one sentence that actually says which product was recommended (the
part a follow-up like "why is this one the best" needs) was reliably
the part getting cut off, while the rewrite model was left staring at
a truncated table with no recommendation to anchor on — so it would
grab some other product that merely looked salient in the table and
rewrite the follow-up against THAT instead. The observed failure: a
prior answer recommending a Walmart listing got rewritten into a
search for an unrelated eBay HP listing that was never the pick,
because the Walmart recommendation sentence had already been sliced
off before the rewrite prompt was built.

Fixed by _extract_prior_answer_context() below: instead of blindly
slicing from the front, it looks for the literal "Relevant data
found:" marker (the same literal marker compare_task requires in its
output — see COMPARATOR RELEVANCE CHECK below) and, if present, keeps
everything from that marker onward (which is exactly the
recommendation paragraph, always the load-bearing part for a
follow-up) plus a bit of leading context. If the marker isn't found
for some reason (e.g. a META/CHAT answer got passed in, or the format
changes), it falls back to keeping the *tail* of the answer rather
than the head, since the recommendation — when present at all — is
always written last. _answer_explain_question() below reuses the same
marker-based extraction for the same reason: the reasoning worth
quoting back to the user is the part after the marker, not the raw
table.

COSMETIC FIX (EXPLAIN reply used to leak the internal marker line):
_answer_explain_question() originally returned everything from the
_RELEVANCE_MARKER onward verbatim, which meant the literal line
"Relevant data found: yes" (a machine-readable flag meant for
_sanity_check_relevance_claim() and log/assert purposes, not for
end users) was shown to the user inside the EXPLAIN reply, e.g.:

    Here's my reasoning from before:

    Relevant data found: yes

    The best pick is the 15.6" Laptop from Store C...

That's harmless but confusing filler the user never asked to see.
_answer_explain_question() now strips the marker+yes/no line itself
after locating it, so only the actual recommendation prose is quoted
back.

COMPARATOR RELEVANCE CHECK:
Rewriting the query correctly (e.g. to "ASUS Chromebook CX15 battery
life") does NOT guarantee the store search tools return anything
about battery life — they do plain keyword matching, so a query like
that can return replacement-battery accessories, wrong sub-models, or
full laptop listings with no spec info at all. Left unchecked, the
comparator agent would quietly fall back to comparing on price (or
whatever data it did have) and present that as if it answered the
original question — which is a worse failure than saying "I don't
know," because it looks like a real answer.

The fix: the comparator task requires a literal, greppable line in
the output — "Relevant data found: yes" or "Relevant data found: no"
— BEFORE any recommendation text, and explicit instructions that a
"no" must not be followed by a recommendation on an unrelated basis.
This is more reliable on a small free-tier model than asking it to
"check first" as pure prose, and it gives calling code a concrete
string to assert on / log, rather than having to parse full prose to
detect a silent substitution. It's still just a prompt instruction
though, so _sanity_check_relevance_claim() below adds a second,
independent, non-LLM check on top of it (see that function's
docstring).

DETERMINISTIC GUARDS (added on top of the prompt-only version):
Several of the behaviors above were originally *only* prompt
instructions to the comparator LLM — which means a bad response from
the (free-tier, small) model could silently violate them with nothing
to catch it. These are now enforced in plain Python before/around the
LLM call, so they no longer depend on the model reliably following
instructions:
  - _all_empty()               -> all-stores-empty case
  - _looks_like_placeholder()  -> fake/placeholder listing detection
  - _sanity_check_relevance_claim() -> catches a "yes" that isn't
    actually backed by any query-relevant text in the output
  - _answer_meta_question() / _answer_explain_question() -> answer
    straight from history text instead of asking an LLM to recall or
    re-justify something it already said, which risks paraphrasing or
    drifting

Entry point: run_product_search(query, history=None) -> str
"""

import logging
import os
import re
import litellm
from crewai import Agent, Task, Crew, Process, LLM
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type
from litellm.exceptions import RateLimitError

# Call the underlying (non-@tool-wrapped) search functions directly.
# .func unwraps CrewAI's @tool decorator so we can call them as plain
# Python functions without going through an agent/LLM turn.
from tools.search_tools import search_store_a, search_store_b, search_store_c

logger = logging.getLogger(__name__)

# Groq's API rejects request params it doesn't recognize. This alone
# does NOT fix the issue below, since drop_params only strips
# top-level request params, not fields injected into message dicts.
litellm.drop_params = True

# Groq's free tier has a tight tokens-per-minute (TPM) budget. Retry
# transient RateLimitErrors with exponential backoff rather than
# letting them crash the /flow request.
litellm.num_retries = 3

# Known CrewAI bug (crewAIInc/crewAI#5886): newer CrewAI versions
# inject a "cache_breakpoint" field directly into system/user message
# dicts to support Anthropic-style prompt caching — but they do this
# unconditionally, even for providers like Groq that reject unknown
# message properties outright. Since it's baked into the message
# content (not a request param), litellm.drop_params can't strip it.
# Workaround: no-op the function that adds it, until upstream fixes
# this to only apply for Anthropic-compatible providers.
try:
    import crewai.llms.cache as _crewai_cache
    _crewai_cache.mark_cache_breakpoint = lambda msg: msg
except ImportError:
    # Older/newer crewai versions may not have this module — safe to
    # skip; if the bug doesn't apply to your version, this is a no-op.
    pass

GROQ_MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-20b")

# Cap how much prior answer text (e.g. a full 9-row markdown table) we
# feed into the rewrite prompt. We only need enough for the model to
# identify which product "which one" refers to, not the whole table
# verbatim — and staying small matters on Groq's free-tier TPM budget.
#
# NOTE: this is a character budget, not a "keep the first N chars"
# instruction — see _extract_prior_answer_context() for how it's
# actually applied. The recommendation sentence (always near the end
# of a real answer) must survive this budget, not just whatever
# happens to be first.
_MAX_PRIOR_ANSWER_CHARS = 1200

# How much context to keep *before* the "Relevant data found:" marker
# when extracting the relevant slice of a prior answer, so the rewrite
# model still sees a bit of the table (e.g. the winning row) rather
# than only the bare recommendation sentence with zero surrounding
# context.
_PRIOR_ANSWER_LEAD_CONTEXT_CHARS = 300

# Literal marker the comparator task is required to emit before any
# recommendation text (see build_crew()'s compare_task and the
# COMPARATOR RELEVANCE CHECK section in the module docstring). Reused
# here by _extract_prior_answer_context() and
# _answer_explain_question() to find the load-bearing part of a prior
# answer, and by _find_last_search_turn() (via _SEARCH_ANSWER_MARKERS
# below) to identify genuine SEARCH-path turns.
_RELEVANCE_MARKER = "Relevant data found:"

# Matches the marker plus its yes/no value and any trailing
# whitespace/newlines, e.g. "Relevant data found: yes\n\n". Used by
# _answer_explain_question() to strip this internal, machine-readable
# line out of what's shown to the user — see the COSMETIC FIX section
# in the module docstring.
_RELEVANCE_MARKER_LINE_RE = re.compile(
    rf"^{re.escape(_RELEVANCE_MARKER)}\s*(?:yes|no)\s*", re.IGNORECASE
)

# Fallback response returned when _classify_intent() decides the
# message isn't a product search at all. Kept as a module-level
# constant so main.py / tests can reference the exact same string
# instead of hardcoding a copy of it.
_NON_SEARCH_REPLY = (
    'Hi! Ask me to find and compare products — e.g. '
    '"best budget laptops under $500".'
)

# Fallback response for an EXPLAIN-classified question when there's no
# prior SEARCH turn to explain (e.g. it's literally the first message,
# or history only contains CHAT/META turns).
_NO_PRIOR_RECOMMENDATION_REPLY = (
    "I haven't made a recommendation yet — ask me to search for a product first, "
    "and I can explain my reasoning afterward."
)

# Patterns that indicate a store's search text is empty / no results,
# used by _all_empty() so the "no products found" case is a
# deterministic Python check instead of something the comparator LLM
# has to notice and report correctly on its own.
_NO_RESULTS_RE = re.compile(
    r"\bno (products?|results?|items?|listings?|matches)\s+found\b"
    r"|\bnothing found\b"
    r"|\bno matches\b",
    re.IGNORECASE,
)

# Heuristics for obviously fake/placeholder listing text (generic
# names, made-up domains). Used by _looks_like_placeholder() so this
# is a Python-level filter applied before the comparator ever sees
# the data, rather than an instruction the model has to remember to
# apply while writing its table.
_PLACEHOLDER_NAME_RE = re.compile(r"\b(product|item)\s*[#\-]?\s*\d+\b", re.IGNORECASE)
_PLACEHOLDER_DOMAIN_RE = re.compile(
    r"\b(store\s*[abc]|example|test|placeholder)\.(com|net|org)\b", re.IGNORECASE
)


def _llm(model: str | None = None, max_tokens: int = 2200) -> LLM:
    """
    Groq-backed LLM factory, used for the comparator agent and the
    query-rewrite step.

    Model: qwen/qwen3.6-27b. llama-3.3-70b-versatile is genuinely
    deprecated on this account now (confirmed via a live
    litellm.exceptions.NotFoundError: "model_not_found" — an earlier
    successful run was likely from before the deprecation took effect,
    or from a different session). qwen3.6-27b was chosen over Groq's
    other suggested replacement, openai/gpt-oss-120b, because the
    "openai/" substring in that model's name triggers a LiteLLM
    provider-detection bug that misroutes requests to OpenAI's own API
    (BerriAI/litellm#14807) — qwen3.6-27b has no such naming collision.

    max_tokens is intentionally NOT being raised further to fix
    truncation. This account is on Groq's free tier with a tight TPM
    budget, and every extra token allowed here is an extra token that
    can trip the rate limit on the very next call. The truncation seen
    with a 9-row table + open-ended recommendation text was fixed by
    constraining the recommendation's length in the task prompt below
    (see compare_task), not by growing this ceiling. Only raise this
    number if the table itself (not the recommendation) is getting
    cut off after confirming eBay links are already being cleaned by
    search_tools._clean_link().
    """
    return LLM(
        model=model or GROQ_MODEL,
        api_key=os.environ.get("GROQ_API_KEY_qwen"),
        max_tokens=max_tokens,
        temperature=0.3,
        reasoning_format="hidden",
        # qwen3 models specifically support fully disabling reasoning via
        # reasoning_effort="none" (unlike gpt-oss, where reasoning is
        # always-on and can only be hidden, not skipped). If this is
        # honored, there's no <think> trace generated at all, so
        # max_tokens can stay much lower than a reasoning-enabled budget
        # would require. _strip_thinking() below still runs regardless,
        # as a safety net in case this parameter also doesn't get
        # reliably forwarded by CrewAI's LLM wrapper.
        reasoning_effort="none",
    )


# Marker substrings unique to a genuine SEARCH-path answer (produced
# either by compare_task's required output format, or by the
# deterministic "no products found" / "all stores empty" message in
# run_product_search). CHAT (_NON_SEARCH_REPLY), META
# (_answer_meta_question), and EXPLAIN (_answer_explain_question)
# replies are all either fixed strings or quotes of a prior SEARCH
# turn, and never independently introduce either marker, so checking
# for these is a reliable, non-LLM way to tell "was this turn's answer
# actually a product search result?" from history alone, without
# changing what's stored in `history` or main.py's API contract.
_SEARCH_ANSWER_MARKERS = (_RELEVANCE_MARKER, "No products were found")


def _find_last_search_turn(history: list[dict] | None) -> dict | None:
    """
    Return the most recent turn in `history` whose answer was a real
    SEARCH-path result, skipping over any CHAT, META, or EXPLAIN turns
    in between — or None if there isn't one.

    WHY THIS EXISTS: history[-1] is simply the most recently completed
    turn, regardless of what kind it was. Once CHAT/META/EXPLAIN turns
    started being appended to history too (main.py appends every
    turn's query+answer unconditionally, not just SEARCH ones), a
    sequence like:
        1. "best budget laptops under $500"   (SEARCH, real results)
        2. "hi"                               (CHAT)
        3. "do you remember my last question"  (META)
        4. "why is this pc the best one"       (EXPLAIN, referring
                                                 back to turn 1)
        5. "is it good for gaming"             (SEARCH follow-up,
                                                 should still refer
                                                 back to turn 1)
    meant _resolve_query() and _classify_intent(), which both blindly
    read history[-1] as "the previous question," would see turn 4 (an
    EXPLAIN exchange with no fresh product data of its own) instead of
    turn 1 (the actual laptop recommendation) when resolving turn 5.
    The laptop context was still sitting in `history`, just not at the
    very end of it, so it got silently ignored.

    This function walks backward from the end of `history` and returns
    the last turn that looks like a genuine SEARCH result, so follow-up
    resolution, meta-answers, and explain-answers all stay anchored to
    the last real product context even after CHAT/META/EXPLAIN turns
    happened in between.
    """
    if not history:
        return None
    for turn in reversed(history):
        answer = turn.get("answer", "")
        if any(marker in answer for marker in _SEARCH_ANSWER_MARKERS):
            return turn
    return None


def _extract_prior_answer_context(answer: str) -> str:
    """
    Return the slice of a prior SEARCH-turn answer that's actually
    useful for resolving a follow-up question, bounded to roughly
    _MAX_PRIOR_ANSWER_CHARS.

    BUG THIS FIXES: an earlier version of this logic was a plain
    head-slice, answer[:_MAX_PRIOR_ANSWER_CHARS]. A real comparator
    answer is a markdown table (often several hundred to 1000+ chars
    on its own for a 9-row table) FOLLOWED BY the "Relevant data
    found: yes/no" line and the actual recommendation paragraph. A
    head-slice at 1200 chars reliably cut the answer off partway
    through the table — before ever reaching the one sentence that
    says which product was recommended and why. Fed that truncated
    input, the rewrite LLM had nothing to anchor "which one" / "this
    one" against, and would grab whatever product looked salient in
    the partial table instead of the one that was actually
    recommended — producing a rewritten query for the WRONG product
    entirely (observed: a Walmart recommendation got silently
    replaced with an unrelated eBay listing in the rewrite).

    FIX: search for the literal _RELEVANCE_MARKER ("Relevant data
    found:") that compare_task requires immediately before the
    recommendation paragraph. If found, keep from
    _PRIOR_ANSWER_LEAD_CONTEXT_CHARS before that marker through the
    end of the answer — i.e. a bit of table context plus the entire
    recommendation, which is exactly the part a follow-up needs, and
    is capped to _MAX_PRIOR_ANSWER_CHARS from the end so it still
    respects the original token/size budget.

    If the marker isn't present (answer is empty, or was somehow not
    a real comparator answer despite being classified as a SEARCH
    turn), fall back to keeping the TAIL of the answer rather than the
    head — the recommendation, when present at all, is always written
    last, so the tail is a strictly better default than the head even
    without the marker to anchor on.
    """
    if not answer:
        return answer

    idx = answer.find(_RELEVANCE_MARKER)
    if idx == -1:
        # No marker found — fall back to tail, not head, since any
        # recommendation text is always written last.
        return answer[-_MAX_PRIOR_ANSWER_CHARS:]

    start = max(0, idx - _PRIOR_ANSWER_LEAD_CONTEXT_CHARS)
    context = answer[start:]
    # Still respect the overall size budget, trimming from the front
    # of this already-relevant slice if needed (never from the back,
    # which would cut off the recommendation again).
    if len(context) > _MAX_PRIOR_ANSWER_CHARS:
        context = context[-_MAX_PRIOR_ANSWER_CHARS:]
    return context


def _classify_intent(query: str, history: list[dict] | None) -> str:
    """
    Classify `query` into exactly one of four categories, given the
    most recent prior SEARCH turn (if any) for context:

      "META"    - the message is asking about the conversation itself
                  (e.g. "do you remember my last question", "what did
                  I ask you previously", "what was your last answer").
                  Answered directly from `history` by
                  _answer_meta_question() — no search.

      "EXPLAIN" - the message is asking you to justify, elaborate on,
                  or explain the reasoning behind the recommendation
                  you JUST gave (e.g. "why is this the best one",
                  "why did you pick that one", "explain your
                  reasoning") — NOT asking about a new product
                  attribute that hasn't already been discussed. If the
                  previous answer's recommendation paragraph already
                  contains the "why," this is EXPLAIN, not SEARCH.
                  Answered directly from `history` by
                  _answer_explain_question() — no search, no rewrite.

      "SEARCH"  - a product search, whether a fresh one ("best budget
                  laptops under $500") or a genuine follow-up that
                  needs NEW data not already in the previous answer
                  ("which one has better battery life", "is it good
                  for gaming", "what about a cheaper one", "are you
                  sure" when re-verification implies re-checking
                  something).

      "CHAT"    - normal conversation unrelated to shopping or to the
                  conversation history: greetings, thanks, small talk,
                  or an accidentally-submitted UI placeholder string.

    WHY THIS IS A SINGLE FOUR-WAY CALL, GIVEN HISTORY UP FRONT:
    Two separate ordering/conflation bugs were found in production,
    each fixed by pulling a new category out of what used to be
    lumped into SEARCH — see the module docstring's INTENT
    CLASSIFICATION section for both incidents in detail. In short:
    classifying on the raw query before resolving follow-ups, or
    after, both failed to distinguish "needs new data" from "asking
    about something already said." Giving the classifier the raw
    query AND the last SEARCH turn up front, in one call, lets it
    make all three distinctions (META / EXPLAIN / SEARCH-new-data) at
    once, before any rewriting happens. Only SEARCH results go on to
    _resolve_query() afterwards.

    Like the rest of this module's LLM calls, this is a single
    LLM.call(), not a CrewAI Agent/Task/Crew, and fails open to
    "SEARCH" on any error so a classifier hiccup never blocks a real
    query (worst case: one wasted search, same fallback risk profile
    as _resolve_query()'s own error handling).
    """
    stripped = query.strip()
    if not stripped:
        return "CHAT"

    last_search_turn = _find_last_search_turn(history)
    if last_search_turn:
        prior_query = last_search_turn.get("query", "")
        prior_reasoning = _extract_prior_answer_context(
            last_search_turn.get("answer", "")
        )
        context_block = (
            f'Previous product-related question: "{prior_query}"\n'
            f"Previous answer's conclusion/reasoning (may be partial):\n"
            f"{prior_reasoning}\n"
        )
    else:
        context_block = "There is no previous product-related question in this conversation yet.\n"

    prompt = (
        f"{context_block}"
        f'New message: "{stripped}"\n\n'
        "Classify the new message into exactly one category:\n\n"
        "META - the message is asking about the conversation itself, e.g. whether "
        "you remember, what the user asked before, or what your last answer was "
        "(\"do you remember my last question\", \"what did I ask you previously\", "
        "\"what was your last answer\").\n\n"
        "EXPLAIN - the message is asking you to justify, elaborate on, or explain the "
        "reasoning behind the recommendation you just gave above, where that reasoning "
        "is ALREADY present in the previous answer's conclusion shown above "
        "(\"why is this the best one\", \"why did you pick that\", \"explain your "
        "reasoning\", \"why not the other one\"). This is NOT asking for a new product "
        "attribute or new data that isn't already in the previous answer.\n\n"
        "SEARCH - a request to search for or compare a product (laptops, headphones, "
        "prices, brands, specs, etc.), OR a follow-up that needs NEW information not "
        "already present in the previous answer above (\"which one has the best "
        "battery life\", \"is it good for gaming\", \"what about a cheaper one\").\n\n"
        "CHAT - normal conversation unrelated to shopping and not about the "
        "conversation history: greetings, thanks, small talk, or placeholder/"
        "instructional text like \"Ask me to find and compare products...\".\n\n"
        "Reply with EXACTLY one word: META, EXPLAIN, SEARCH, or CHAT. No punctuation, "
        "no explanation."
    )

    try:
        classify_llm = _llm(GROQ_MODEL, max_tokens=10)
        response = classify_llm.call(messages=[{"role": "user", "content": prompt}])
        result = _strip_thinking(str(response)).strip().upper()
        for label in ("META", "EXPLAIN", "SEARCH", "CHAT"):
            if label in result:
                return label
        return "SEARCH"  # unrecognized output -> fail open to search
    except Exception:
        logger.warning(
            "Intent classification failed for query %r, defaulting to SEARCH",
            query,
            exc_info=True,
        )
        return "SEARCH"  # fail-open: a wasted search beats wrongly refusing a real one


def _answer_meta_question(history: list[dict] | None) -> str:
    """
    Deterministically answer a META-classified question (one asking
    about the conversation itself) directly from `history`, with no
    LLM call involved.

    This is intentionally NOT generated by an LLM: a generated answer
    about what was "previously asked" risks paraphrasing or subtly
    misstating the prior turn, which is a worse failure for a
    memory-related question than a plain, literal quote of it. Since
    the exact prior query is already sitting in `history`, just quote
    it directly rather than asking a model to reproduce it from
    memory.
    """
    if not history:
        return "This is the start of our conversation — you haven't asked me anything yet."

    last_turn = history[-1]
    prior_query = last_turn.get("query", "").strip()
    if not prior_query:
        return "This is the start of our conversation — you haven't asked me anything yet."

    return (
        f'Yes — your previous question was: "{prior_query}". '
        "Ask me to search again, or ask a follow-up about those results."
    )


def _answer_explain_question(history: list[dict] | None) -> str:
    """
    Deterministically answer an EXPLAIN-classified question ("why is
    this the best one", "why did you pick that") directly from the
    last real SEARCH turn's answer, with no LLM call and no new
    search involved.

    WHY THIS EXISTS (bug it fixes): before EXPLAIN existed, a question
    like "why is this laptop the best one" was classified as SEARCH,
    which sent it to _resolve_query() — a function whose only tool is
    "rewrite this into a new search query." Since a "why" question
    isn't a request for new product data, the rewrite model reached
    for whatever it could turn into search keywords (observed: "2026
    HP Laptop Store B review"), which was then sent to
    Amazon/eBay/Walmart — stores that have no "review" content type at
    all. The search came back with unrelated product listings instead
    of any reasoning, and the comparator correctly reported "Relevant
    data found: no" to a question that was never answerable by
    searching in the first place: the reasoning the user actually
    wanted was already sitting, verbatim, in the previous turn's
    answer.

    This function fixes that by never touching search at all: it finds
    the last real SEARCH turn (_find_last_search_turn, so it correctly
    skips over any CHAT/META/EXPLAIN turns that happened in between),
    extracts the recommendation/reasoning portion of that turn's answer
    using the same marker-based logic as _extract_prior_answer_context
    (everything from "Relevant data found:" onward — the exact
    sentence(s) that contain the "why"), and returns it directly,
    with a short framing line. No LLM regeneration, so there's no risk
    of the explanation drifting, being paraphrased incorrectly, or (as
    in the bug above) silently swapping in a different product.

    COSMETIC FIX: the marker line itself ("Relevant data found:
    yes"/"no") is stripped out of what's quoted back — it's an
    internal flag for _sanity_check_relevance_claim() and log/assert
    purposes, not something the user needs to see. Without this strip,
    a real reply looked like:

        Here's my reasoning from before:

        Relevant data found: yes

        The best pick is the 15.6" Laptop from Store C...

    which is harmless but confusing filler. _RELEVANCE_MARKER_LINE_RE
    removes just that one line (marker + yes/no + trailing whitespace)
    from the front of the extracted slice, leaving only the actual
    recommendation prose.
    """
    last_turn = _find_last_search_turn(history)
    if not last_turn:
        return _NO_PRIOR_RECOMMENDATION_REPLY

    answer = last_turn.get("answer", "")
    idx = answer.find(_RELEVANCE_MARKER)
    if idx == -1:
        # Shouldn't normally happen for a turn that matched
        # _SEARCH_ANSWER_MARKERS via "No products were found" instead
        # of the relevance marker — in that case there was no
        # recommendation to begin with.
        return _NO_PRIOR_RECOMMENDATION_REPLY

    reasoning = answer[idx:].strip()
    reasoning = _RELEVANCE_MARKER_LINE_RE.sub("", reasoning).strip()

    if not reasoning:
        # Marker was present but nothing followed it (shouldn't happen
        # given compare_task's required output format, but guard
        # against an empty quote looking like a silent failure).
        return _NO_PRIOR_RECOMMENDATION_REPLY

    return f"Here's my reasoning from before:\n\n{reasoning}"


def _run_searches(query: str) -> dict[str, str]:
    """
    Call all three store search tools directly in Python.

    Returns the raw text each tool produced, unmodified. This is the
    exact text that used to get lost or paraphrased away by the
    per-store search agents — now it goes straight to the comparator
    with no LLM turn in between to drop it.
    """
    return {
        "Store A (Amazon)": search_store_a.func(query),
        "Store B (eBay)": search_store_b.func(query),
        "Store C (Walmart)": search_store_c.func(query),
    }


def _all_empty(search_results: dict[str, str]) -> bool:
    """
    Deterministic, Python-level check for "every store came back
    empty," so this no longer depends on the comparator LLM noticing
    and saying so in prose. A store counts as empty if its text is
    blank or matches a "no results" pattern; if any single store has
    real content, this returns False.
    """
    for text in search_results.values():
        stripped = (text or "").strip()
        if stripped and not _NO_RESULTS_RE.search(stripped):
            return False
    return True


def _looks_like_placeholder(text: str) -> bool:
    """
    Heuristic check for obviously fake/placeholder listing text —
    generic names like "Product 1" or made-up domains like
    "storea.com". This is intentionally crude (it flags the whole
    store block, not individual listings) — the goal is to catch the
    obvious dev/test-data case, not to be a general fraud detector.
    """
    if not text:
        return False
    return bool(_PLACEHOLDER_NAME_RE.search(text) or _PLACEHOLDER_DOMAIN_RE.search(text))


def _filter_placeholder_results(search_results: dict[str, str]) -> dict[str, str]:
    """
    Replace any store's text that looks like placeholder/fake data
    with an explicit "no real data" marker before it ever reaches the
    comparator prompt. Previously this relied entirely on the
    comparator LLM noticing and excluding it itself.
    """
    filtered = {}
    for store, text in search_results.items():
        if _looks_like_placeholder(text):
            logger.info("Filtered placeholder/fake data from %s", store)
            filtered[store] = "No real data found (search returned placeholder/fake listings)."
        else:
            filtered[store] = text
    return filtered


def _resolve_query(query: str, history: list[dict] | None) -> str:
    """
    Resolve a possibly-context-dependent follow-up query into a
    standalone one, using only the most recent prior SEARCH turn.

    Examples:
      history has a turn about laptops, query = "which one has the
      best battery life" -> "ASUS Chromebook CX15 battery life"

      history has a turn about laptops, query = "show me headphones
      under $50" -> unchanged (not actually a follow-up)

    If there's no history, or the rewrite call fails for any reason,
    fall back to the original query untouched rather than blocking
    the whole search on a rewrite failure.

    NOTE: this function intentionally does NOT also do intent
    classification (META / EXPLAIN / SEARCH / CHAT) — by the time this
    runs, _classify_intent() has already run on the raw query and
    confirmed it's SEARCH, so only genuine new-data search queries
    ever reach this function. In particular, "why"-style follow-ups
    that don't need new data are now classified as EXPLAIN and
    answered by _answer_explain_question() WITHOUT ever reaching this
    function — see that function's docstring for the bug this
    prevents (a "why" question used to be rewritten into a nonsensical
    search here, e.g. "... review", which no store engine can satisfy).

    NOTE: uses _find_last_search_turn(history), not history[-1]. Once
    CHAT/META/EXPLAIN turns started being stored in `history` too
    (every turn gets appended in main.py, not just SEARCH ones),
    history[-1] could be a CHAT/META/EXPLAIN exchange with no new
    product content in it (e.g. "hi" or "why is this the best one").
    Resolving a genuine follow-up like "is it good for gaming" against
    that kind of turn had nothing useful to rewrite against, so the
    real prior product context (e.g. a laptop recommended two turns
    earlier) got silently dropped. Anchoring on the last real SEARCH
    turn instead keeps follow-up resolution working even when
    CHAT/META/EXPLAIN turns happened in between.

    NOTE: the prior answer is passed through
    _extract_prior_answer_context(), not a plain head-slice — see that
    function's docstring for the bug this fixes (a head-slice was
    cutting off the recommendation sentence itself on long tables,
    causing follow-ups to get resolved against the wrong product).
    """
    last_turn = _find_last_search_turn(history)
    if not last_turn:
        return query

    prior_query = last_turn.get("query", "")
    prior_answer = _extract_prior_answer_context(last_turn.get("answer", ""))

    if not prior_query and not prior_answer:
        return query

    rewrite_prompt = (
        "You rewrite follow-up shopping questions into standalone search queries.\n\n"
        f"Previous user query: {prior_query}\n"
        f"Previous answer (may be truncated, but the recommendation/conclusion, if "
        f"any, is preserved in full):\n{prior_answer}\n\n"
        f'New question: "{query}"\n\n'
        "If the new question refers back to something from the previous answer (e.g. it "
        "says \"which one\", \"that one\", \"the first option\", \"is it good for X\", or "
        "otherwise doesn't make sense as a search on its own):\n"
        "  - The previous answer ends with a single recommended product — use THAT one "
        "product, not the full list of products mentioned in the table.\n"
        "  - Rewrite the new question into a short, standalone search query naming just "
        "that one specific product plus what's being asked about it "
        "(e.g. \"ASUS Chromebook CX15 battery life\", NOT a list of every product "
        "compared against each other).\n"
        "  - Never join multiple product names together with \"vs\" — pick the single "
        "recommended one only.\n"
        "If the new question does NOT refer back to anything above and stands fine on its "
        "own, return it completely unchanged.\n\n"
        "Examples:\n"
        "  Previous query: \"best budget laptops\"\n"
        "  Previous answer ends with: \"...I'd recommend the ASUS Chromebook CX15.\"\n"
        "  New question: \"which one has the best battery life\"\n"
        "  -> \"ASUS Chromebook CX15 battery life\"\n\n"
        "  Previous query: \"best budget laptops\"\n"
        "  Previous answer ends with: \"...I'd recommend the ASUS Chromebook CX15.\"\n"
        "  New question: \"show me headphones under $50\"\n"
        "  -> \"show me headphones under $50\" (unchanged — not a follow-up)\n\n"
        "Reply with ONLY the resulting search query text — no quotes, no explanation, no "
        "extra words."
    )

    try:
        rewrite_llm = _llm(GROQ_MODEL, max_tokens=120)
        response = rewrite_llm.call(messages=[{"role": "user", "content": rewrite_prompt}])
        rewritten = _strip_thinking(str(response)).strip().strip('"')
        return rewritten or query
    except Exception:
        # Rewrite is a best-effort enhancement, not a hard dependency —
        # if Groq is rate-limited or errors here, just search the raw
        # query rather than failing the whole request.
        logger.warning("Query rewrite failed, falling back to raw query", exc_info=True)
        return query


def build_crew(query: str, search_results: dict[str, str]) -> Crew:
    compare_llm = _llm(GROQ_MODEL)

    comparator_agent = Agent(
        role="Product Comparator & Reporter",
        goal="Compare products found across Store A, B, and C and recommend the best "
             "option with respect to what the user specifically asked about — never a "
             "different criterion presented as if it answers the question.",
        backstory="You are a meticulous shopping advisor. You never invent products or "
                   "prices that weren't given to you. If a store had no data, you say so "
                   "instead of guessing. Critically: search results can match the search "
                   "keywords without containing the actual attribute the user asked about "
                   "(e.g. a listing for a laptop with no battery-life spec, or a "
                   "replacement-battery accessory instead of the laptop itself). When that "
                   "happens, you say so plainly instead of quietly picking a winner on an "
                   "unrelated basis like price and presenting it as if it answered the "
                   "question. You always state explicitly, in the required 'Relevant data "
                   "found: yes/no' line, whether the requested attribute was actually "
                   "present before writing any recommendation. You write concisely — you "
                   "never pad your answer with numbered lists or multi-paragraph "
                   "justifications when a couple of sentences will do.",
        llm=compare_llm,
        verbose=True,
        max_iter=1,  # no tools to call — should answer in a single pass
    )

    results_block = "\n\n".join(
        f"{store}:\n{text}" for store, text in search_results.items()
    )

    compare_task = Task(
        description=(
            "Here are the RAW, VERBATIM search results already retrieved from Store A, "
            "Store B, and Store C. Do not call any tools — these results are final and "
            "complete:\n\n"
            f"{results_block}\n\n"
            f"The user's question was: '{query}'.\n\n"
            "You MUST structure your output in exactly this order:\n\n"
            "1. The markdown comparison table (see expected_output for columns).\n"
            f"2. A line starting with exactly '{_RELEVANCE_MARKER} ' followed by 'yes' "
            "or 'no' — answering whether the Key Features text above actually contains "
            "information relevant to what was asked (e.g. for a battery life question, "
            "does any listing mention battery capacity, mAh, Wh, or hours of use — not "
            "just match the search keywords). A product matching the search terms is NOT "
            "the same as containing the requested data — e.g. a replacement-battery "
            "accessory listing, a listing for a different sub-model, or a laptop listing "
            "with no spec section for the attribute asked about does NOT count as 'yes'.\n"
            "3. If 'yes': one short paragraph (2-3 sentences, no lists) naming the single "
            "best pick on that basis and why.\n"
            "   If 'no': one short paragraph stating plainly that none of the results "
            "contain the requested information, and that price or other specs cannot "
            "substitute for it. Do NOT recommend a 'best' product on an unrelated basis "
            "in this case — just state clearly that the question can't be answered from "
            "these results.\n\n"
            "If a store's block above says it has no data, treat that store as having no "
            "data — do not invent products for it. "
            "IMPORTANT: every product link shown above must be preserved and shown in full "
            "in your output — never omit, shorten, or replace a link with just the product "
            "name."
        ),
        expected_output="A markdown comparison table with columns: Store, Product, Price, "
                         "Link, Key Features — where Link is the full clickable URL for each "
                         "product exactly as given above. Then a line reading exactly "
                         f"'{_RELEVANCE_MARKER} yes' or '{_RELEVANCE_MARKER} no'. Then ONE "
                         "short paragraph (2-3 sentences, no lists): if yes, the single best "
                         "pick, its link, and a brief reason why; if no, a clear statement "
                         "that the requested information wasn't found in these results "
                         "(no substitute recommendation).",
        agent=comparator_agent,
    )

    return Crew(
        agents=[comparator_agent],
        tasks=[compare_task],
        process=Process.sequential,
        verbose=True,
    )


def _sanity_check_relevance_claim(query: str, result_text: str) -> str:
    """
    Lightweight, non-LLM guard against the comparator claiming
    'Relevant data found: yes' without anything in its own output
    actually backing that up.

    This does NOT re-verify the model's reasoning (that's genuinely
    hard to guarantee against a small free-tier model) — it just does
    a crude keyword-overlap check between the query's content words
    and the full output text. If a 'yes' claim shares zero overlap
    with what was asked, that's a strong signal of a false positive
    (e.g. the model said yes but is actually recommending on price),
    so we append a visible warning rather than silently trusting the
    self-report. No overlap found -> warn; overlap found, or the
    claim is 'no' -> pass through unchanged.
    """
    match = re.search(
        rf"{re.escape(_RELEVANCE_MARKER)}\s*(yes|no)", result_text, re.IGNORECASE
    )
    if not match or match.group(1).lower() != "yes":
        return result_text

    stopwords = {
        "which", "one", "has", "the", "best", "is", "a", "an", "for", "of", "in",
        "on", "with", "and", "or", "to", "does", "do", "are", "was", "were",
        "show", "me", "find", "what", "how",
    }
    query_terms = {
        w.lower().strip(".,?!\"'")
        for w in query.split()
        if w.lower() not in stopwords and len(w) > 2
    }

    text_lower = result_text.lower()
    if query_terms and not any(term in text_lower for term in query_terms):
        warning = (
            "\n\n⚠️ **Automated check**: the comparator marked this as "
            f"'{_RELEVANCE_MARKER} yes', but none of the query terms "
            f"({', '.join(sorted(query_terms))}) appear anywhere in the output. "
            "This may be a false positive — verify manually before trusting this "
            "recommendation."
        )
        logger.warning(
            "Relevance sanity check failed for query %r — no term overlap found", query
        )
        return result_text + warning
    return result_text


@retry(
    retry=retry_if_exception_type(RateLimitError),
    wait=wait_exponential(multiplier=1, min=2, max=20),
    stop=stop_after_attempt(5),
    before_sleep=lambda retry_state: logger.warning(
        "Groq rate limit hit (attempt %d/%d), retrying...",
        retry_state.attempt_number,
        5,
    ),
)
def run_product_search(query: str, history: list[dict] | None = None) -> str:
    """
    Run the three store searches directly in Python (no LLM turn, so
    no risk of an agent summarizing away real data), then let a single
    comparator agent reason over the guaranteed-verbatim results.

    history: prior turns from session_state["turns"], e.g.
        [{"query": "...", "answer": "...", "timestamp": "..."}, ...]
    in chronological order (most recent last). Optional — omit or pass
    None/[] for a fresh, context-free search.

    Before anything else, _classify_intent() looks at the RAW query
    plus the last prior SEARCH turn (if any) and sorts it into META,
    EXPLAIN, SEARCH, or CHAT in one pass:
      - META    -> answered directly from `history` by
                   _answer_meta_question(), deterministically, with no
                   search and no comparator LLM call at all (e.g. "do
                   you remember my last question").
      - EXPLAIN -> answered directly from `history` by
                   _answer_explain_question(), deterministically, with
                   no search and no comparator LLM call at all (e.g.
                   "why is this the best one") — see that function's
                   docstring for the production bug this fixes (such
                   questions used to be rewritten into a nonsensical
                   store search like "... review").
      - CHAT    -> short-circuits with a canned prompt
                   (_NON_SEARCH_REPLY) and never reaches SerpApi (e.g.
                   "hi").
      - SEARCH  -> only this path continues on to _resolve_query(), so
                   a genuine follow-up that needs new data, like
                   "which one has the best battery life" or "is it
                   good for gaming", gets rewritten against the prior
                   turn before searching.
    Giving the classifier history context up front (rather than
    classifying before or after _resolve_query() runs, and rather than
    lumping "why" questions into SEARCH) avoids the ordering and
    conflation bugs described in the module docstring's INTENT
    CLASSIFICATION section.

    Placeholder/fake-looking store results are filtered out in Python
    before the comparator ever sees them (_filter_placeholder_results),
    and if every store ends up empty, a deterministic "no products
    found" message is returned without calling the LLM at all
    (_all_empty) — neither of these depend on the comparator noticing
    and reporting it correctly in prose.

    The comparator's output is required to include a literal
    "Relevant data found: yes/no" line before any recommendation, and
    a "yes" claim is spot-checked post-hoc for keyword overlap with
    the query (_sanity_check_relevance_claim) before being returned.
    """
    intent = _classify_intent(query, history)

    if intent == "META":
        logger.info("Classified as meta-question, answering from history: %r", query)
        return _answer_meta_question(history)

    if intent == "EXPLAIN":
        logger.info("Classified as explain-question, answering from history: %r", query)
        return _answer_explain_question(history)

    if intent == "CHAT":
        logger.info("Classified as non-search chat, skipping search: %r", query)
        return _NON_SEARCH_REPLY

    resolved_query = _resolve_query(query, history)
    search_results = _run_searches(resolved_query)
    search_results = _filter_placeholder_results(search_results)

    if _all_empty(search_results):
        logger.info("All stores returned empty results for query: %s", resolved_query)
        return (
            "No products were found for this search across any of the connected "
            "stores. Try rephrasing the query or broadening the search terms."
        )

    crew = build_crew(resolved_query, search_results)
    result = crew.kickoff()
    final = _strip_thinking(str(result))
    final = _sanity_check_relevance_claim(resolved_query, final)
    return final


def _strip_thinking(text: str) -> str:
    """
    Remove any visible <think>...</think> reasoning block from the model's
    output.

    qwen3.6-27b is a reasoning model that, by default, writes its full
    chain-of-thought into the response before the actual answer. The
    reasoning_format="hidden" parameter is supposed to suppress this at
    the API level, but CrewAI's LLM wrapper doesn't reliably forward all
    non-standard kwargs to LiteLLM in every code path (same class of bug
    as the earlier base_url/api_base issue) — reasoning_format="hidden"
    was still showing up in the raw output during testing. This is a
    defense-in-depth fix at the Python level that works regardless of
    whether the API-level parameter actually took effect: if a <think>
    block is present, drop it and return only what follows.
    """
    if "<think>" not in text:
        return text.strip()

    # If the closing tag is missing (response got cut off mid-thought,
    # e.g. from an insufficient max_tokens budget on a previous run),
    # there's no real answer to recover — surface that clearly rather
    # than returning an empty string that looks like a silent failure.
    if "</think>" not in text:
        logger.warning(
            "Model response truncated mid-reasoning (no closing </think> tag); "
            "consider raising max_tokens in crew.py."
        )
        return (
            "The model's response was cut off while still reasoning and "
            "never produced a final answer. Try again, or increase "
            "max_tokens further in crew.py if this keeps happening."
        )

    return re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()