from dotenv import load_dotenv
load_dotenv()
import os
from langchain_groq import ChatGroq
from orchestrator import CLASSIFY_PROMPT

llm = ChatGroq(model='llama-3.3-70b-versatile', groq_api_key=os.environ.get('GROQ_API_KEY'), temperature=0)
response = llm.invoke([('system', CLASSIFY_PROMPT), ('user', 'hi')])
print(repr(response.content))