import re
from typing import Dict, Any, List, Tuple
from rapidfuzz import fuzz

SUPPORTED_INTENTS = [
    "CHECK_ELIGIBILITY",
    "APPLICATION_STATUS",
    "REQUIRED_DOCUMENTS",
    "UPLOAD_DOCUMENT",
    "CORRECTION_REQUIRED",
    "PENSION_INFORMATION",
    "SCHEME_INFORMATION",
    "APPLICATION_PROCESS",
    "PAYMENT_INFORMATION",
    "PROFILE_HELP",
    "LANGUAGE_HELP",
    "GENERAL_FAQ"
]

INTENT_RULES = {
    "CHECK_ELIGIBILITY": [
        "eligible", "eligibility", "can i apply", "qualify", "am i eligible", "age limit", "income limit",
        "தகுதி", "விண்ணப்பிக்க முடியுமா", "வயது வரம்பு", "வருமான வரம்பு"
    ],
    "APPLICATION_STATUS": [
        "status", "track", "where is my application", "pen-2026", "ps-2026", "progress",
        "நிலை", "விண்ணப்ப நிலை", "என் விண்ணப்பம் எங்கே", "ட்ராக்"
    ],
    "REQUIRED_DOCUMENTS": [
        "document", "documents", "what docs", "papers required", "certificate needed", "aadhaar",
        "ஆவணங்கள்", "தேவையான சான்றிதழ்கள்", "என்னென்ன ஆவணங்கள்", "வருமான சான்று"
    ],
    "UPLOAD_DOCUMENT": [
        "upload", "file size", "pdf", "jpg", "camera", "quality", "scan",
        "பதிவேற்றம்", "புகைப்படம்", "ஸ்கேன்", "கோப்பு அளவு"
    ],
    "CORRECTION_REQUIRED": [
        "action required", "correction", "fix", "resubmit", "modify application",
        "திருத்தம்", "சரிசெய்ய", "மீண்டும் விண்ணப்பிக்க"
    ],
    "PENSION_INFORMATION": [
        "how much pension", "payout", "amount", "monthly pension", "1000", "1500",
        "ஓய்வூதிய தொகை", "மாதாந்திர உதவித்தொகை", "எவ்வளவு கிடைக்கும்"
    ],
    "SCHEME_INFORMATION": [
        "scheme", "schemes", "ignoaps", "destitute", "widow pension", "annapurna", "disabled",
        "திட்டங்கள்", "விதவை ஓய்வூதியம்", "முதியோர் உதவித்தொகை", "அன்னபூர்ணா"
    ],
    "APPLICATION_PROCESS": [
        "how to apply", "steps", "process", "guide", "procedure",
        "எப்படி விண்ணப்பிப்பது", "வழிமுறைகள்", "செயல்முறை"
    ],
    "PAYMENT_INFORMATION": [
        "bank", "account", "dbt", "treasury", "credit", "money received",
        "வங்கி கணக்கு", "பணம் வரவு", "வங்கி விவரம்"
    ],
    "PROFILE_HELP": [
        "profile", "mobile number change", "address update", "edit details",
        "சுயவிவரம்", "முகவரி மாற்றம்", "தொலைபேசி எண் மாற்றம்"
    ],
    "LANGUAGE_HELP": [
        "language", "tamil", "english", "voice", "read aloud", "speak",
        "மொழி", "தமிழ்", "ஆங்கிலம்", "குரல் உதவி"
    ],
    "GENERAL_FAQ": [
        "help", "contact", "support", "what is pension seva", "who are you",
        "உதவி", "தொடர்பு", "பென்ஷன் சேவா என்றால் என்ன"
    ]
}

def classify_intent(query: str) -> Tuple[str, float]:
    """Classifies user natural query into one of the supported Welfare Assist intents."""
    query_clean = query.strip().lower()
    best_intent = "GENERAL_FAQ"
    best_score = 0.0

    for intent, keywords in INTENT_RULES.items():
        for kw in keywords:
            if kw in query_clean:
                score = 95.0
                if score > best_score:
                    best_score = score
                    best_intent = intent
            else:
                ratio = fuzz.partial_ratio(kw, query_clean)
                if ratio > 80 and ratio > best_score:
                    best_score = ratio
                    best_intent = intent

    if best_score < 50.0:
        best_intent = "GENERAL_FAQ"
        best_score = 45.0

    return best_intent, round(best_score, 1)

def generate_chat_response(query: str, language: str = "en") -> Dict[str, Any]:
    """Generates an accessible, helpful response for Welfare Assist in English or Tamil."""
    intent, confidence = classify_intent(query)
    is_tamil = language == "ta"

    # Search for an application ID inside query
    app_id_match = re.search(r"(?:PEN|PS)-\d{4}-\d+", query, re.IGNORECASE)
    found_app_id = app_id_match.group(0).upper() if app_id_match else None

    if found_app_id:
        if is_tamil:
            reply = f"விண்ணப்ப எண் {found_app_id} பற்றிய தகவல்களை 'விண்ணப்பத்தைக் கண்காணி' (Track Application) பக்கத்தில் நேரடியாகப் பார்க்கலாம். உங்கள் விண்ணப்பம் பரிசீலனையில் உள்ளது."
        else:
            reply = f"For application {found_app_id}, you can inspect live progress in the 'Track Application' section. If an administrative review note is pending, no further action is required at this time."
        return {
            "reply": reply,
            "intent": "APPLICATION_STATUS",
            "suggestedActions": ["Track Application", "View Dashboard"],
            "quickReplies": ["What documents are needed?", "Check eligibility again"]
        }

    responses_en = {
        "CHECK_ELIGIBILITY": (
            "You can use our step-by-step Eligibility Wizard to assess your preliminary qualification. "
            "It checks your age (60+ years), annual income (typically ≤ ₹72,000/yr), residency, and existing welfare benefits. "
            "Would you like to start the eligibility check now?"
        ),
        "APPLICATION_STATUS": (
            "You can track your submitted applications anytime under 'Track Application' or on your Dashboard. "
            "Please provide your Application ID (e.g., PS-2026-000123) to view the exact milestone."
        ),
        "REQUIRED_DOCUMENTS": (
            "For most senior citizen welfare pensions, you will need: "
            "1. Proof of Age (Aadhaar or Birth Proof)\n"
            "2. Income Certificate (issued by Tahsildar/VAO)\n"
            "3. Bank Passbook copy (with IFSC and Account Number)\n"
            "4. Residence proof / Ration Card."
        ),
        "UPLOAD_DOCUMENT": (
            "You can upload clear photos or PDF copies (up to 10 MB). "
            "Ensure all 4 corners are visible, lighting is adequate, and text is readable. "
            "Our automated quality checker will inspect blur and readability before reading the details."
        ),
        "CORRECTION_REQUIRED": (
            "When an application status is 'Action Required', an officer has requested a correction (such as re-uploading a blurry document or clarifying an income certificate). "
            "Visit your application details to review the remarks and resubmit the requested item."
        ),
        "PENSION_INFORMATION": (
            "Under the Indira Gandhi Old Age Pension (IGNOAPS) and Tamil Nadu state support, beneficiaries receive ₹1,000 per month (for age 60-79) and ₹1,500 per month (for age 80+), along with subsidized food grain benefits."
        ),
        "SCHEME_INFORMATION": (
            "Pension Seva features active welfare schemes such as: "
            "1. IGNOAPS + TN Top-Up\n"
            "2. TN Destitute Senior Citizen Pension\n"
            "3. Destitute Widow Pension (from age 40)\n"
            "4. Annapurna Senior Food Grain Scheme\n"
            "5. Differently Abled Senior Pension.\n"
            "Check the 'Schemes' section to explore details."
        ),
        "APPLICATION_PROCESS": (
            "The process is simple: "
            "1. Check Eligibility → 2. Choose Scheme → 3. Fill Details → 4. Upload Documents → 5. Confirm Extracted Info → 6. Submit Application → 7. Track Progress."
        ),
        "PAYMENT_INFORMATION": (
            "Approved pensions are disbursed directly to your verified bank account via Direct Benefit Transfer (DBT). "
            "Ensure your bank account is active and linked with your Aadhaar for smooth crediting."
        ),
        "PROFILE_HELP": (
            "You can manage your contact information, language, and accessibility preferences in the 'Profile' and 'Settings' sections."
        ),
        "LANGUAGE_HELP": (
            "Pension Seva supports English and Tamil (தமிழ்). You can switch languages anytime using the toggle button in the top navigation bar, and listen aloud using the speaker icon."
        ),
        "GENERAL_FAQ": (
            "Pension Seva is an independent welfare-assistance platform that helps citizens discover schemes, verify documents, and track applications step by step. How may I assist you today?"
        )
    }

    responses_ta = {
        "CHECK_ELIGIBILITY": (
            "எங்கள் எளிய தகுதி சரிபார்ப்பு வழிகாட்டி மூலம் உங்கள் தகுதியை கணிக்கலாம். "
            "வயது (60+), ஆண்டு வருமானம் (≤ ரூ.72,000), மற்றும் இருப்பிட சான்றுகளை அடிப்படையாகக் கொண்டு இது மதிப்பிடப்படுகிறது."
        ),
        "APPLICATION_STATUS": (
            "உங்கள் விண்ணப்பத்தின் நிலையை 'விண்ணப்பத்தைக் கண்காணி' (Track Application) பக்கத்தில் அறியலாம். "
            "உங்கள் விண்ணப்ப எண்ணை (எ.கா. PS-2026-000123) உள்ளிட்டு தற்போதைய நிலையைத் தெரிந்துகொள்ளுங்கள்."
        ),
        "REQUIRED_DOCUMENTS": (
            "முதியோர் ஓய்வூதியத்திற்கு பொதுவாக தேவையான ஆவணங்கள்: "
            "1. வயது சான்று (ஆதார் அட்டை)\n"
            "2. வருமான சான்றிதழ் (வட்டாட்சியர் வழங்கியது)\n"
            "3. வங்கி கணக்கு புத்தகம்\n"
            "4. குடும்ப அட்டை (ரேஷன் கார்டு)."
        ),
        "UPLOAD_DOCUMENT": (
            "நீங்கள் தெளிவான புகைப்படம் அல்லது PDF கோப்பை (அதிகபட்சம் 10 MB) பதிவேற்றலாம். "
            "எழுத்துக்கள் தெளிவாக தெரியும்படி பதிவேற்றவும்."
        ),
        "CORRECTION_REQUIRED": (
            "விண்ணப்பத்தில் 'திருத்தம் தேவை' (Action Required) என்று வந்தால், அதிகாரி குறிப்பிட்ட ஆவணத்தை மீண்டும் தெளிவாக பதிவேற்றம் செய்ய வேண்டும்."
        ),
        "PENSION_INFORMATION": (
            "முதியோர் ஓய்வூதியத் திட்டத்தின் கீழ் மாதந்தோறும் ரூ.1,000 (60-79 வயது) அல்லது ரூ.1,500 (80+ வயது) நேரடி வங்கிப் பரிமாற்றம் மூலம் வழங்கப்படுகிறது."
        ),
        "SCHEME_INFORMATION": (
            "தமிழகத்தில் உள்ள முக்கிய திட்டங்கள்: இந்திரா காந்தி முதியோர் ஓய்வூதியம், ஆதரவற்ற முதியோர் உதவித்தொகை, ஆதரவற்ற விதவை ஓய்வூதியம், அன்னபூர்ணா உணவுத் திட்டம் மற்றும் மாற்றுத்திறனாளி ஓய்வூதியம்."
        ),
        "APPLICATION_PROCESS": (
            "விண்ணப்பிக்கும் முறை: 1. தகுதி அறிதல் → 2. திட்டம் தேர்வு → 3. விவரங்கள் நிரப்புதல் → 4. ஆவணம் பதிவேற்றம் → 5. சரிபார்த்து சமர்ப்பித்தல்."
        ),
        "PAYMENT_INFORMATION": (
            "ஒப்புதல் அளிக்கப்பட்ட ஓய்வூதியம் உங்கள் வங்கிக் கணக்கில் நேரடியாக (DBT) செலுத்தப்படும்."
        ),
        "PROFILE_HELP": (
            "உங்கள் சுயவிவரம் மற்றும் அமைப்புகளை 'Profile' பக்கத்தில் மாற்றியமைத்துக் கொள்ளலாம்."
        ),
        "LANGUAGE_HELP": (
            "பென்ஷன் சேவா ஆங்கிலம் மற்றும் தமிழ் மொழிகளை ஆதரிக்கிறது. மேல் மெனுவில் மொழியை மாற்றலாம், ஸ்பீக்கர் மூலம் கேட்கலாம்."
        ),
        "GENERAL_FAQ": (
            "பென்ஷன் சேவா என்பது குடிமக்கள் தகுதியான ஓய்வூதிய திட்டங்களை அறிந்து விண்ணப்பிக்க உதவும் உதவித் தளம். நான் உங்களுக்கு எப்படி உதவ முடியும்?"
        )
    }

    resp_dict = responses_ta if is_tamil else responses_en
    reply = resp_dict.get(intent, resp_dict["GENERAL_FAQ"])

    suggested_actions = ["Check Eligibility", "View Schemes", "Track Application", "Upload Documents"]
    quick_replies = [
        "What documents are needed?" if not is_tamil else "என்னென்ன ஆவணங்கள் தேவை?",
        "Am I eligible for pension?" if not is_tamil else "எனக்கு தகுதி உள்ளதா?",
        "How do I track my application?" if not is_tamil else "விண்ணப்பத்தை எவ்வாறு கண்காணிப்பது?"
    ]

    return {
        "reply": reply,
        "intent": intent,
        "suggestedActions": suggested_actions,
        "quickReplies": quick_replies
    }
