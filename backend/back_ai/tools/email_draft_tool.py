import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

_sg_client = SendGridAPIClient(os.environ.get("SENDGRID_API_KEY"))
FROM_EMAIL = os.environ.get("FROM_EMAIL", "noreply@yourapp.com")


def send_email(parameters: dict) -> dict:
    """
    Actually sends an email. This is only ever called AFTER a human has
    approved the draft that action_agent.py proposed - it is never called
    directly from the agent itself, since agents in this system only
    propose actions, they don't execute them.

    `parameters` is exactly what action_agent.py put in toolCalls[0]["parameters"],
    possibly edited by the user in the approval UI first - expected shape:
    {"to": "...", "subject": "...", "body": "..."}
    """
    required = ("to", "subject", "body")
    missing = [field for field in required if not parameters.get(field)]
    if missing:
        return {
            "success": False,
            "error": f"Missing required field(s): {', '.join(missing)}",
        }

    message = Mail(
        from_email=FROM_EMAIL,
        to_emails=parameters["to"],
        subject=parameters["subject"],
        plain_text_content=parameters["body"],
    )

    try:
        response = _sg_client.send(message)
        return {
            "success": response.status_code in (200, 201, 202),
            "statusCode": response.status_code,
        }
    except Exception as exc:
        # Same principle as main.py's error handling - don't let a raw
        # SendGrid exception bubble up to the approval endpoint's caller.
        return {"success": False, "error": str(exc)}