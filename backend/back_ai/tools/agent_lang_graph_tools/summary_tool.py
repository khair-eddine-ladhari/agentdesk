from langchain_core.tools import tool

from tools.agent_lang_graph_tools.query_workspace_docs import retrieve


def make_summarize_tool(namespace: str, meetings: list, tasks: list):
    """
    Factory - returns a summarize_upcoming_meetings tool with this request's
    meetings/tasks/namespace baked in via closure. These come from the
    trusted Node payload, not from the LLM, so a per-request tool instance
    is built rather than exposing them as LLM-fillable parameters.
    """

    @tool
    def summarize_upcoming_meetings() -> str:
        """
        Summarize the user's upcoming meetings. For each meeting, pulls
        relevant context from workspace documents and lists related open
        tasks (matched by attendee), then returns a short brief per meeting.

        Use when the user asks e.g. "summarize my next meetings", "what's
        coming up this week", "prep me for my meetings". Takes no
        arguments - meetings/tasks for this workspace are already loaded.
        """
        if not meetings:
            return "No upcoming meetings found."

        briefs = []
        for meeting in meetings:
            title = meeting.get("title", "Untitled meeting")
            attendees = meeting.get("attendees", [])
            start_time = meeting.get("start_time", "unknown time")

            try:
                doc_hits = retrieve(f"{title} {' '.join(attendees)}", namespace)
            except Exception as exc:
                doc_context = f"Error retrieving related documents: {exc}"
            else:
                doc_context = (
                    "\n".join(f"[Source: {r['source']}] {r['text']}" for r in doc_hits)
                    if doc_hits else "No related documents found."
                )

            related_tasks = [
                t for t in tasks
                if t.get("assignee") in attendees
            ] if attendees else []
            tasks_text = (
                "\n".join(f"- {t.get('title')} (due {t.get('due_date')})" for t in related_tasks)
                or "None"
            )

            briefs.append(
                f"**{title}** — {start_time}\n"
                f"Attendees: {', '.join(attendees) or 'none listed'}\n\n"
                f"Relevant documents:\n{doc_context}\n\n"
                f"Open tasks:\n{tasks_text}"
            )

        return "\n\n---\n\n".join(briefs)

    return summarize_upcoming_meetings