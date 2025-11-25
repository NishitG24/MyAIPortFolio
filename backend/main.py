import asyncio
import os
import smtplib
import re
from email.message import EmailMessage
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr, Field
from pypdf import PdfReader
from twilio.rest import Client as TwilioClient

from openai import OpenAI


BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
FRONTEND_DIR = BASE_DIR / "frontend"
STATIC_DIR = FRONTEND_DIR / "static"
SUMMARY_PATH = DATA_DIR / "summary.txt"
PROFILE_PDF_PATH = DATA_DIR / "Combined_Profile.pdf"
RESUME_PATH = DATA_DIR / "Nishit_Gupta_SDET_Resume (1).pdf"

load_dotenv(override=True)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY") or os.getenv("API_Key")
GEMINI_CLIENT = None
if OPENAI_API_KEY:
    GEMINI_CLIENT = OpenAI(
        api_key=OPENAI_API_KEY,
        base_url=os.getenv(
            "OPENAI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai/"
        ),
    )


def _read_summary() -> str:
    if not SUMMARY_PATH.exists():
        return ""
    return SUMMARY_PATH.read_text(encoding="utf-8").strip()


def _read_pdf_text(pdf_path: Path) -> str:
    if not pdf_path.exists():
        return ""
    reader = PdfReader(str(pdf_path))
    pages = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            pages.append(text)
    return "\n".join(pages)


def _extract_section(text: str, start: str, end: str | None = None) -> str:
    if start not in text:
        return ""
    section = text.split(start, 1)[1]
    if end and end in section:
        section = section.split(end, 1)[0]
    return section.strip()


def _parse_list_block(block: str) -> List[str]:
    items = []
    for line in block.splitlines():
        line = line.strip()
        if not line:
            continue
        if line.startswith("-"):
            items.append(line.lstrip("- ").strip())
        else:
            items.append(line)
    return items


def _parse_experiences(block: str) -> List[Dict[str, Any]]:
    experiences: List[Dict[str, Any]] = []
    current: Dict[str, Any] | None = None

    for raw_line in block.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        if "|" in line and not line.startswith("-"):
            if current:
                experiences.append(current)
            parts = [part.strip() for part in line.split("|")]
            role = parts[1] if len(parts) > 1 else ""
            meta = parts[2] if len(parts) > 2 else ""
            location = parts[3] if len(parts) > 3 else ""
            current = {
                "company": parts[0],
                "role": role,
                "period": meta,
                "location": location,
                "highlights": [],
            }
            continue

        if line.startswith("-") and current:
            current["highlights"].append(line.lstrip("- ").strip())

    if current:
        experiences.append(current)

    return experiences


def _build_profile_payload(summary_text: str, profile_text: str) -> Dict[str, Any]:
    professional_summary = _extract_section(
        profile_text, "Professional Summary:", "Core Competencies:"
    )
    skills_block = _extract_section(profile_text, "Core Competencies:", "Professional Experience:")
    experience_block = _extract_section(profile_text, "Professional Experience:", "Key Projects:")
    projects_block = _extract_section(profile_text, "Key Projects:", "Achievements:")
    achievements_block = _extract_section(profile_text, "Achievements:", "Certifications:")
    certification_block = _extract_section(profile_text, "Certifications:", "Education:")

    contact_block = _extract_section(profile_text, "Contact:", "Professional Summary:")

    return {
        "summary": summary_text or professional_summary,
        "professional_summary": professional_summary,
        "skills": _parse_list_block(skills_block),
        "experiences": _parse_experiences(experience_block),
        "projects": _parse_list_block(projects_block),
        "achievements": _parse_list_block(achievements_block),
        "certifications": _parse_list_block(certification_block),
        "contact": _parse_list_block(contact_block),
    }


SUMMARY_TEXT = _read_summary()
PROFILE_TEXT = _read_pdf_text(PROFILE_PDF_PATH)
PROFILE_PAYLOAD = _build_profile_payload(SUMMARY_TEXT, PROFILE_TEXT)

# Build system prompt matching the notebook implementation
NAME = "Nishit Gupta"
BOOKS_CONTEXT = """
## Books by Nishit Gupta:
1. THE UNNAMED TRAIN: A Journey To The Station Of Nothing
    - What if the destination you’ve been chasing was never meant to be found—but felt?
    - A philosophical journey with Arjun, exploring fulfillment and meaning.
    - Amazon: https://a.co/d/eQYRSSp

2. Living With Courage and Clarity
    - Wisdom from the Bhagavad Gita for overcoming life's uncertainties.
    - Actionable strategies for courage, clarity, and resilience.
    - Amazon: https://a.co/d/8h4XZVM

3. The 9 Effect: Why Odd Prices Sell More
    - Explains pricing psychology and why prices ending in 9 sell more.
    - Amazon: https://a.co/d/5d0qQG0

4. Discover the Ram in You
    - A journey of self-discovery inspired by Ram's timeless virtues.
    - Practical wisdom for personal transformation and ethical leadership.
    - Amazon: https://a.co/d/eQZJHAh
"""

SYSTEM_PROMPT = (
     f"You are acting as {NAME}. You are answering questions on {NAME}'s website, "
     f"particularly questions related to {NAME}'s career, background, skills, experience, and books. "
     f"Your responsibility is to represent {NAME} for interactions on the website as faithfully as possible. "
     f"You are given a summary of {NAME}'s background, LinkedIn profile, and book information which you can use to answer questions. "
     f"Be professional and engaging, as if talking to a potential client or future employer who came across the website. "
     f"If you don't know the answer, say so.\n\n"
     f"## Summary:\n{SUMMARY_TEXT}\n\n"
     f"## LinkedIn Profile:\n{PROFILE_TEXT}\n\n"
     f"{BOOKS_CONTEXT}\n\n"
     f"With this context, please chat with the user, always staying in character as {NAME}."
)


class ChatHistoryItem(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    history: List[ChatHistoryItem] = Field(default_factory=list)
    user_email: Optional[str] = None


class ContactRequest(BaseModel):
    email: EmailStr
    message: str = Field(..., min_length=10, max_length=2000)


app = FastAPI(title="Nishit Gupta Portfolio API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/", response_class=HTMLResponse)
def get_root() -> HTMLResponse:
    html_path = FRONTEND_DIR / "index.html"
    if not html_path.exists():
        raise HTTPException(status_code=404, detail="Frontend not found.")
    return HTMLResponse(html_path.read_text(encoding="utf-8"))


@app.get("/api/profile")
def get_profile() -> Dict[str, Any]:
    if not PROFILE_PAYLOAD["summary"]:
        raise HTTPException(status_code=500, detail="Profile data unavailable.")
    return PROFILE_PAYLOAD


async def _run_agent(message: str, history: List[ChatHistoryItem]) -> str:
    if GEMINI_CLIENT is None:
        raise HTTPException(status_code=503, detail="Chatbot is not configured. Please set API_Key or OPENAI_API_KEY environment variable.")

    # Convert history to messages format expected by OpenAI API
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    
    # Add conversation history
    for item in history:
        messages.append({"role": item.role, "content": item.content})
    
    # Add current user message
    messages.append({"role": "user", "content": message})

    # Run in executor to avoid blocking
    loop = asyncio.get_event_loop()
    response = await loop.run_in_executor(
        None,
        lambda: GEMINI_CLIENT.chat.completions.create(
            model=os.getenv("OPENAI_AGENT_MODEL", "gemini-2.5-flash"),
            messages=messages,
            max_tokens=500,
            temperature=0.7
        )
    )
    
    reply = response.choices[0].message.content
    if not reply:
        reply = "I'm sorry, but I could not generate a response right now."
    return reply.strip()


@app.post("/api/chat")
async def chat_endpoint(payload: ChatRequest) -> Dict[str, Any]:
    reply = await _run_agent(payload.message, payload.history)
    
    # Check if bot cannot answer the question
    if _bot_cannot_answer(reply):
        # Check if we're waiting for user email (check last message in history)
        waiting_for_email = False
        if payload.history:
            last_assistant_msg = None
            for item in reversed(payload.history):
                if item.role == "assistant":
                    last_assistant_msg = item.content.lower()
                    break
            
            if last_assistant_msg and "email" in last_assistant_msg and ("provide" in last_assistant_msg or "share" in last_assistant_msg or "give" in last_assistant_msg):
                waiting_for_email = True
        
        # If we have user email, send WhatsApp notification
        if payload.user_email:
            # Validate email format
            email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if re.match(email_pattern, payload.user_email):
                # Send WhatsApp notification in background
                asyncio.create_task(_send_whatsapp_notification(payload.message, payload.user_email))
                reply = (
                    f"{reply}\n\n"
                    f"Thank you for providing your email ({payload.user_email}). "
                    f"I've notified Nishit about your question, and he'll get back to you soon!"
                )
            else:
                reply = (
                    f"{reply}\n\n"
                    f"Please provide a valid email address so I can notify Nishit about your question."
                )
        elif not waiting_for_email:
            # First time bot can't answer - ask for email
            reply = (
                f"{reply}\n\n"
                f"I'm sorry I couldn't help with that. To ensure Nishit can get back to you, "
                f"could you please provide your email address?"
            )
        else:
            # Still waiting for email
            reply = (
                f"{reply}\n\n"
                f"Please provide your email address so I can notify Nishit about your question."
            )
    
    return {"reply": reply, "needs_email": _bot_cannot_answer(reply) and not payload.user_email}



# --- Gmail SMTP ---
def _send_email_sync(sender: str, password: str, to_email: str, body: str) -> None:
    """Synchronously send email via Gmail SMTP."""
    try:
        msg = EmailMessage()
        msg["Subject"] = "New message from NishitGupta.ai portfolio"
        msg["From"] = sender
        msg["To"] = to_email
        msg.set_content(body)

        # Gmail uses STARTTLS on port 587
        with smtplib.SMTP("smtp.gmail.com", 587) as smtp:
            smtp.starttls()
            smtp.login(sender, password)
            smtp.send_message(msg)
    except smtplib.SMTPAuthenticationError as e:
        error_msg = (
            "Gmail authentication failed. Please ensure:\n"
            "1. You're using your Gmail email and password\n"
            "2. If 2FA is enabled, use an App Password:\n"
            "   - Go to https://myaccount.google.com/security\n"
            "   - Security → App passwords → Create a new app password\n"
            "3. Set it as: export GMAIL_PASSWORD='your-password'\n"
            f"Error details: {e}"
        )
        raise ValueError(error_msg)
    except smtplib.SMTPException as e:
        raise ValueError(f"Failed to send email: {e}")
    except Exception as e:
        raise ValueError(f"Unexpected error sending email: {e}")


async def _send_contact_email(sender_email: str, message: str) -> None:
    gmail_sender = os.getenv("GMAIL_SENDER", "nishitautomationtest@gmail.com")
    gmail_password = os.getenv("GMAIL_PASSWORD")
    recipient_email = os.getenv("GMAIL_RECIPIENT", "nishitautomationtest@gmail.com")

    if not gmail_password:
        raise HTTPException(
            status_code=503,
            detail=(
                "Email service not configured. Please set GMAIL_PASSWORD environment variable.\n"
                "To set up Gmail:\n"
                "1. Use your Gmail email: nishitautomationtest@gmail.com\n"
                "2. If 2FA is enabled, create an App Password:\n"
                "   - Go to https://myaccount.google.com/security\n"
                "   - Security → App passwords → Create a new app password\n"
                "3. Set: export GMAIL_PASSWORD='your-password'"
            ),
        )

    body = (
        f"You have a new message from your portfolio website.\n\n"
        f"Sender: {sender_email}\n\n"
        f"Message:\n{message}"
    )

    loop = asyncio.get_event_loop()
    await loop.run_in_executor(
        None, _send_email_sync, gmail_sender, gmail_password, recipient_email, body
    )


async def _send_whatsapp_notification(question: str, user_email: Optional[str] = None) -> None:
    """Send WhatsApp notification when bot can't answer a question."""
    twilio_account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    twilio_auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    twilio_whatsapp_from = os.getenv("TWILIO_WHATSAPP_FROM")  # Format: whatsapp:+14155238886
    whatsapp_to = os.getenv("WHATSAPP_TO", "whatsapp:+919889612031")  # Your number
    
    if not all([twilio_account_sid, twilio_auth_token, twilio_whatsapp_from]):
        # Log but don't fail - WhatsApp is optional
        print("WhatsApp not configured. Skipping notification.")
        return
    
    try:
        client = TwilioClient(twilio_account_sid, twilio_auth_token)
        
        message_body = (
            f"🤖 Bot couldn't answer a question:\n\n"
            f"❓ Question: {question}\n\n"
        )
        
        if user_email:
            message_body += f"📧 User Email: {user_email}\n"
        else:
            message_body += "⚠️ User email not provided\n"
        
        message_body += "\nPlease check the chat and respond manually."
        
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: client.messages.create(
                body=message_body,
                from_=twilio_whatsapp_from,
                to=whatsapp_to
            )
        )
    except Exception as e:
        # Log but don't fail - WhatsApp is optional
        print(f"WhatsApp notification failed: {e}")


def _bot_cannot_answer(reply: str) -> bool:
    """Detect if the bot indicates it cannot answer the question."""
    cannot_answer_phrases = [
        "i don't know",
        "i don't have",
        "i'm not sure",
        "i cannot",
        "i can't",
        "i'm unable",
        "i don't have information",
        "i don't have that information",
        "i'm sorry, but i",
        "i'm not able",
        "i don't have access",
        "i don't have details",
        "i'm not certain",
        "i'm unsure",
        "i don't have context",
    ]
    
    reply_lower = reply.lower()
    return any(phrase in reply_lower for phrase in cannot_answer_phrases)


@app.post("/api/contact")
async def contact_endpoint(payload: ContactRequest) -> Dict[str, str]:
    try:
        await _send_contact_email(payload.email, payload.message)
        return {"status": "sent", "message": "Your message has been sent successfully!"}
    except HTTPException:
        raise
    except ValueError as e:
        # This is likely an authentication error with helpful instructions
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send email: {str(e)}"
        )


@app.get("/download/resume")
def download_resume() -> FileResponse:
    if not RESUME_PATH.exists():
        raise HTTPException(status_code=404, detail="Resume not found.")
    return FileResponse(
        path=str(RESUME_PATH),
        filename="Nishit_Gupta_SDET_Resume.pdf",
        media_type="application/pdf",
    )


