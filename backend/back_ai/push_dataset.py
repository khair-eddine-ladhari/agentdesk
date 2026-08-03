"""
push_dataset.py

One-time script to create a LangSmith dataset with the routing test
cases we've been debugging manually, plus a simple evaluator that
checks whether the orchestrator's agentType matches what's expected.

Run once with: python push_dataset.py
Requires LANGCHAIN_API_KEY to already be set in your environment/.env
(same one used for tracing).
"""
from dotenv import load_dotenv
load_dotenv()

from langsmith import Client

client = Client()

DATASET_NAME = "agentdesk-routing-tests"

# Each item: (query, history, expected_agent_type, note)
TEST_CASES = [
    ("hi", [], "chat", "Basic greeting shortcut"),
    ("thanks", [], "chat", "Greeting shortcut"),
    ("what does our contract say about termination?", [], "rag", "Simple doc lookup"),
    ("remind me to check the invoice", [], "action", "Casual action phrasing - routing fix"),
    ("can you set up a call with Sarah next week", [], "action", "Casual action phrasing, no explicit verb"),
    ("someone should follow up with the vendor", [], "action", "Indirect action phrasing"),
    (
        "talked about Q3 budget, need to follow up with finance by Friday, John will send the report",
        [],
        "structuring",
        "Raw-notes extraction",
    ),
    (
        "our workspace docs mention our current subscription price - find it and calculate what a 20% increase would look like",
        [],
        "research",
        "Multi-tool chain (query_workspace_docs -> calculate)",
    ),
    (
        "what's the latest pricing Slack announced for their business plans?",
        [],
        "research",
        "Forces search_web",
    ),
    (
        "khairrrrrr@gmail.com",
        [
            {
                "role": "assistant",
                "content": "Competitor's email address is missing. Please provide the competitor's email address to send a reminder email.",
                "agentType": "action",
                "requiresApproval": False,
            }
        ],
        "action",
        "Sticky-routing bug - bare reply to unresolved action question",
    ),
    (
        "yes",
        [
            {
                "role": "assistant",
                "content": "Would you like me to schedule that for 3pm?",
                "agentType": "action",
                "requiresApproval": False,
            }
        ],
        "action",
        "Same bug, bare confirmation",
    ),
    (
        "and i have to call the seo so he can rize our funds more",
        [],
        "chat",
        "Misrouted case - rambling/vague, not a real action",
    ),
    (
        "now write a professional email and his email is khairdinldh@gmail.com",
        [
            {
                "role": "assistant",
                "content": "I don't have a valid email address for that person - could you give me their email so I can send it?",
                "agentType": "action",
                "requiresApproval": False,
            }
        ],
        "action",
        "Should continue the action, not fall to chat",
    ),
    ("okay", [], "chat", "Greeting-list exact match"),
]


def main():
    # Create the dataset (skip if it already exists)
    existing = list(client.list_datasets(dataset_name=DATASET_NAME))
    if existing:
        dataset = existing[0]
        print(f"Using existing dataset: {dataset.id}")
    else:
        dataset = client.create_dataset(
            dataset_name=DATASET_NAME,
            description="Routing test cases for run_orchestrator - covers greetings, rag, action, structuring, research, and the sticky-action-routing bug fixed on 2026-08-03.",
        )
        print(f"Created dataset: {dataset.id}")

    for query, history, expected_type, note in TEST_CASES:
        client.create_example(
            inputs={"query": query, "history": history, "namespace": None},
            outputs={"agentType": expected_type},
            metadata={"note": note},
            dataset_id=dataset.id,
        )

    print(f"Pushed {len(TEST_CASES)} examples to '{DATASET_NAME}'.")


if __name__ == "__main__":
    main()