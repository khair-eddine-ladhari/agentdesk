"""
run_experiment.py

Runs the "agentdesk-routing-tests" dataset against the real orchestrator
and scores whether each query routed to the expected agentType.

Run once with: python run_experiment.py
Must be run from the same folder as orchestrator.py (or with it on
your PYTHONPATH), and needs LANGCHAIN_API_KEY + GROQ_API_KEY set in
.env - this makes real Groq calls, so check your quota before running.
"""

from dotenv import load_dotenv
load_dotenv()

from langsmith import evaluate
from orchestrator import run_orchestrator


def target(inputs: dict) -> dict:
    """
    Called once per dataset row by evaluate(). Takes the row's inputs
    and runs them through the real orchestrator, returning just the
    agentType so it can be compared against each row's expected output.
    """
    result = run_orchestrator(
        query=inputs["query"],
        namespace=inputs.get("namespace"),
        history=inputs.get("history", []),
    )
    return {"agentType": result["agentType"]}


def routing_correct(run, example) -> dict:
    """
    Compares the target's predicted agentType against the dataset row's
    expected agentType. Score of 1 = pass, 0 = fail - shown per row in
    the LangSmith experiment results table.
    """
    predicted = run.outputs.get("agentType")
    expected = example.outputs.get("agentType")
    return {"key": "routing_correct", "score": int(predicted == expected)}


if __name__ == "__main__":
    evaluate(
        target,
        data="agentdesk-routing-tests",
        evaluators=[routing_correct],
        experiment_prefix="routing-check",
    )