from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from backend.services.nlp_service import classify_intent, generate_chat_response, SUPPORTED_INTENTS
from backend.models import ChatRequest, ChatResponse

router = APIRouter(prefix="", tags=["NLP & Welfare Assist"])

class UnderstandRequest(BaseModel):
    text: str
    language: Optional[str] = "en"

class TranslateRequest(BaseModel):
    text: str
    targetLanguage: str = "ta"

@router.post("/api/nlp/understand")
async def nlp_understand(payload: UnderstandRequest):
    intent, confidence = classify_intent(payload.text)
    return {
        "intent": intent,
        "confidence": confidence,
        "language": payload.language,
        "text": payload.text
    }

@router.get("/api/nlp/intents")
async def get_intents():
    return {"intents": SUPPORTED_INTENTS}

@router.post("/api/nlp/translate")
async def nlp_translate(payload: TranslateRequest):
    # Dictionary fallback translations
    en_to_ta = {
        "Check Eligibility": "தகுதியை சரிபார்க்கவும்",
        "Start Application": "விண்ணப்பிக்க தொடங்குங்கள்",
        "Track Application": "விண்ணப்பத்தை கண்காணிக்கவும்",
        "Upload Documents": "ஆவணங்களை பதிவேற்றவும்",
        "Likely Eligible": "தகுதியுடையவர்",
        "Possible Match": "பொருத்தமான வாய்ப்பு",
        "Not Currently Eligible": "தற்போது தகுதியில்லை",
        "Application Submitted Successfully": "விண்ணப்பம் வெற்றிகரமாக சமர்ப்பிக்கப்பட்டது",
        "Action Required": "நடவடிக்கை தேவை",
        "Under Review": "பரிசீலனையில் உள்ளது",
        "Approved": "ஒப்புதல் அளிக்கப்பட்டது",
        "Rejected": "நிராகரிக்கப்பட்டது"
    }
    translated = en_to_ta.get(payload.text, payload.text)
    return {
        "original": payload.text,
        "translated": translated,
        "targetLanguage": payload.targetLanguage
    }

@router.post("/api/chat", response_model=ChatResponse)
async def chat_welfare_assist(payload: ChatRequest):
    result = generate_chat_response(payload.message, language=payload.language or "en")
    return ChatResponse(
        reply=result["reply"],
        intent=result["intent"],
        suggestedActions=result.get("suggestedActions", []),
        quickReplies=result.get("quickReplies", [])
    )
