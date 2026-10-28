from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, EmailStr
from datetime import datetime

# --- AUTH & USER MODELS ---
class UserSettings(BaseModel):
    large_text: bool = False
    high_contrast: bool = False
    read_aloud: bool = True
    voice_input: bool = True
    simple_mode: bool = False
    speech_speed: str = "slow"  # "slow", "normal", "fast"
    notif_app_updates: bool = True
    notif_scheme_updates: bool = True
    notif_correction_alerts: bool = True
    notif_general: bool = True

class UserRegister(BaseModel):
    fullName: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    mobile: str = Field(..., min_length=10, max_length=15)
    password: str = Field(..., min_length=6)
    confirmPassword: Optional[str] = None
    preferredLanguage: str = Field("en", pattern="^(en|ta)$")
    termsAccepted: bool = Field(True)

class UserLogin(BaseModel):
    identifier: str  # Email or Mobile
    password: str
    otp: Optional[str] = None

class FamilyMemberInfo(BaseModel):
    name: str
    relation: str
    age: Optional[int] = None
    occupation: Optional[str] = ""

class UserProfile(BaseModel):
    id: str
    fullName: str
    email: str
    mobile: str
    role: str  # "USER" or "ADMIN"
    preferredLanguage: str
    settings: Optional[UserSettings] = None
    createdAt: str
    profilePhoto: Optional[str] = None  # data URL or hosted image URL
    dob: Optional[str] = None
    gender: Optional[str] = None
    addressInfo: Optional[Dict[str, Any]] = None
    maritalStatus: Optional[str] = None  # Single, Married, Widowed, Divorced
    familyMembers: List[FamilyMemberInfo] = []

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile

class UserUpdateRequest(BaseModel):
    fullName: Optional[str] = None
    mobile: Optional[str] = None
    preferredLanguage: Optional[str] = None
    settings: Optional[UserSettings] = None
    profilePhoto: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    addressInfo: Optional[Dict[str, Any]] = None
    maritalStatus: Optional[str] = None
    familyMembers: Optional[List[FamilyMemberInfo]] = None

class ForgotPasswordRequest(BaseModel):
    mobileOrEmail: Optional[str] = None
    identifier: Optional[str] = None
    email: Optional[str] = None
    mobile: Optional[str] = None

class PasswordResetRequest(BaseModel):
    email: Optional[str] = None
    identifier: Optional[str] = None
    mobile: Optional[str] = None
    mobileOrEmail: Optional[str] = None
    otp: Optional[str] = None
    verification_token: Optional[str] = None
    newPassword: str = Field(..., min_length=6)
    confirmPassword: Optional[str] = None

# --- SCHEME MODELS ---
class SchemeModel(BaseModel):
    id: str
    nameEn: str
    nameTa: str
    deptEn: str
    deptTa: str
    payoutEn: str
    payoutTa: str
    minAge: int
    maxIncome: int
    residenceRequired: str = "Tamil Nadu"
    benefitType: str
    requiredDocuments: List[str]
    descriptionEn: str
    descriptionTa: str
    isActive: bool = True
    quotaCount: int = 5000
    activeBeneficiaries: int = 1240
    # Official provenance (spec §8 / §67)
    source_name: Optional[str] = None
    official_source_url: Optional[str] = None
    source_last_verified: Optional[str] = None
    rule_version: Optional[int] = 1
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

class SchemeCreate(BaseModel):
    nameEn: str
    nameTa: str
    deptEn: str
    deptTa: str
    payoutEn: str
    payoutTa: str
    minAge: int
    maxIncome: int
    residenceRequired: str = "Tamil Nadu"
    benefitType: str
    requiredDocuments: List[str]
    descriptionEn: str
    descriptionTa: str
    isActive: bool = True

# --- COMPLAINT MODELS (spec §23) ---
COMPLAINT_STATUSES = ["OPEN", "IN_REVIEW", "RESOLVED", "REJECTED"]

class ComplaintCreate(BaseModel):
    applicationId: Optional[str] = None
    category: str = Field(..., description="PAYMENT_NOT_RECEIVED | DOCUMENT_ISSUE | STATUS_QUERY | OTHER")
    description: str = Field(..., min_length=10, max_length=2000)
    paymentReference: Optional[str] = None
    amountClaimed: Optional[float] = None


class ComplaintUpdate(BaseModel):
    status: str
    adminRemarks: str = Field(..., min_length=3, max_length=1000)


# --- ELIGIBILITY RULES ---
class EligibilityRuleModel(BaseModel):
    ruleId: str
    version: int = 1
    schemeId: str
    minAge: int
    maxIncome: int
    residenceRequired: str = "Tamil Nadu"
    benefitConflictsAllowed: bool = False
    requiredDocuments: List[str]
    isActive: bool = True
    updatedBy: Optional[str] = "Admin"
    createdAt: Optional[str] = None

class EligibilityRuleCreate(BaseModel):
    schemeId: str
    minAge: int
    maxIncome: int
    residenceRequired: str = "Tamil Nadu"
    benefitConflictsAllowed: bool = False
    requiredDocuments: List[str]
    isActive: bool = True

# --- ELIGIBILITY MODELS ---
class ExistingBenefitDetail(BaseModel):
    scheme: Optional[str] = ""
    benefitType: Optional[str] = ""
    amount: Optional[int] = 0
    status: Optional[str] = "Active"

class EligibilityCheckInput(BaseModel):
    age: int
    dob: Optional[str] = None
    residenceState: str = "Tamil Nadu"
    district: str = "Chennai"
    residenceType: Optional[str] = "Urban"
    annualIncome: int
    incomeSource: Optional[str] = "Daily Wage / Agriculture"
    incomeCertificateAvailable: bool = True
    hasExistingPension: bool = False
    existingBenefitDetails: Optional[ExistingBenefitDetail] = None
    existingPensionName: Optional[str] = None
    existingPensionAmount: Optional[int] = 0
    isWidow: bool = False
    hasDisability: bool = False
    disabilityPercentage: Optional[int] = 0
    hasIncomeCertificate: bool = True
    hasAgeProof: bool = True
    hasBankPassbook: bool = True

class ScoreBreakdown(BaseModel):
    ageScore: int = Field(..., description="Max 25")
    incomeScore: int = Field(..., description="Max 25")
    residenceScore: int = Field(..., description="Max 20")
    benefitScore: int = Field(..., description="Max 10")
    documentConfidenceScore: int = Field(..., description="Max 6")
    identityConsistencyScore: int = Field(..., description="Max 10")
    totalScore: int = Field(..., description="0-100")

class SchemeMatchSummary(BaseModel):
    schemeId: str
    schemeName: str
    matchStatus: str = "Possible Match"  # "Likely Eligible", "Possible Match", "Not Currently Eligible"
    matchPercentage: int
    keyConditionsMet: List[str]
    reasons: List[str]
    requiredDocuments: List[str]

class EligibilityAssessmentResponse(BaseModel):
    evaluationId: Optional[str] = None
    score: int
    status: str  # "LIKELY ELIGIBLE" | "POSSIBLE MATCH / NEEDS REVIEW" | "LIKELY NOT ELIGIBLE"
    breakdown: ScoreBreakdown
    reasons: List[str]
    missingInformation: List[str]
    conditionsAffected: List[str]
    recommendedSchemes: List[SchemeMatchSummary]
    disclaimer: str = "This assessment is a decision-support result. Final application decisions require administrative review."

# --- DOCUMENT & OCR MODELS ---
class DocumentQualityResult(BaseModel):
    blurScore: float
    isBlurry: bool
    brightness: float
    isBrightnessAcceptable: bool
    contrast: float
    isContrastAcceptable: bool
    resolution: str
    overallQuality: str  # "Good" or "Needs Attention"
    guidanceNotes: List[str]

class ExtractedNLPFields(BaseModel):
    name: Optional[str] = None
    dob: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    annualIncome: Optional[int] = None
    certificateNumber: Optional[str] = None
    addressTokens: Optional[List[str]] = []
    issuerAuthority: Optional[str] = None
    district: Optional[str] = None
    confidenceScore: Optional[float] = None

class DocumentProcessResponse(BaseModel):
    docId: str
    originalName: str
    fileType: str
    quality: DocumentQualityResult
    ocrText: str
    extractedFields: ExtractedNLPFields
    ocrEngine: str = "unavailable"
    ocrVersion: Optional[str] = None
    pipelineVersion: str = "pension-seva-doc-pipeline/2.0"
    fieldEvidence: Dict[str, Any] = Field(default_factory=dict)
    processingErrors: List[str] = Field(default_factory=list)
    autoFillNotice: str = "We found some information in your document. Please check it before continuing."
    # --- document intelligence (v3): classification + document-specific fields
    detectedDocumentType: Optional[str] = None          # e.g. INCOME_CERTIFICATE
    detectedDocumentTypeLabel: Optional[str] = None     # e.g. "Income Certificate"
    classificationConfidence: Optional[float] = None
    classificationKeywords: List[str] = Field(default_factory=list)
    # {field: {value, confidence, source}} — document-specific, from actual OCR
    documentFields: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    # {field: {sourceText, page, boundingBox, confidence}} — audit trail
    documentFieldEvidence: Dict[str, Any] = Field(default_factory=dict)
    extractionConfidence: Optional[float] = None
    extractionStatus: str = "COMPLETED"   # COMPLETED | NEEDS_REVIEW | FAILED


class DocumentMatchScore(BaseModel):
    nameMatchPercentage: Optional[float] = None
    dobMatchPercentage: Optional[float] = None
    incomeMatchPercentage: Optional[float] = None
    certNumberMatchPercentage: Optional[float] = None
    overallConfidence: Optional[float] = None
    identityStatus: str  # "VERIFIED" | "PARTIALLY VERIFIED" | "REVIEW REQUIRED" | "NOT VERIFIED"
    details: List[str]

# --- APPLICATION MODELS ---
class PersonalInfo(BaseModel):
    fullName: str
    dob: str
    gender: str
    mobile: str
    email: Optional[str] = ""
    # Only the final four digits are collected to compare an Aadhaar OCR result.
    aadhaarLast4: Optional[str] = None

class AddressInfo(BaseModel):
    doorNo: str
    street: str
    villageTown: str
    district: str
    state: str = "Tamil Nadu"
    pinCode: str

class IncomeInfo(BaseModel):
    annualIncome: int
    incomeSource: str
    incomeCertificateNo: str

class ExistingBenefitsInfo(BaseModel):
    hasExistingPension: bool
    otherWelfareBenefits: bool
    schemeName: Optional[str] = ""
    benefitType: Optional[str] = ""
    benefitAmount: Optional[int] = 0
    status: Optional[str] = "Active"
    conflictStatus: Optional[str] = "No conflict detected"  # or "Possible conflict — review required"

class BankInfo(BaseModel):
    accountHolderName: str
    bankName: str
    branch: str
    accountNumber: str  # Masked when stored/displayed: "XXXX XXXX 1234"
    confirmAccountNumber: Optional[str] = ""
    ifscCode: str

class UploadedDocSummary(BaseModel):
    docId: str
    docType: str
    fileName: str
    qualityStatus: str
    extractedFields: Optional[Dict[str, Any]] = None
    ocrStatus: Optional[str] = "Completed"
    verificationStatus: Optional[str] = "Verified"

class ApplicationSubmitRequest(BaseModel):
    schemeId: str
    personalInfo: PersonalInfo
    addressInfo: AddressInfo
    incomeInfo: IncomeInfo
    existingBenefitsInfo: ExistingBenefitsInfo
    bankInfo: BankInfo
    uploadedDocs: List[UploadedDocSummary]
    schemeAnswers: Optional[Dict[str, Any]] = None  # scheme-specific form answers
    userConsent: bool
    aiScoreSnapshot: Optional[int] = 86
    eligibilitySnapshot: Optional[Dict[str, Any]] = None
    docMatchScore: Optional[DocumentMatchScore] = None

class TimelineStep(BaseModel):
    step: str
    status: str  # "completed", "current", "pending", "action-required", "rejected"
    title: str
    date: str
    description: str

class ApplicationResponse(BaseModel):
    id: str
    userId: str
    schemeId: str
    schemeName: str
    status: str  # "DRAFT", "SUBMITTED", "DOCUMENT VERIFICATION", "UNDER REVIEW", "APPROVED", "ACTION REQUIRED", "REJECTED", "COMPLETED"
    appliedDate: str
    lastUpdated: str
    personalInfo: PersonalInfo
    addressInfo: AddressInfo
    incomeInfo: IncomeInfo
    existingBenefitsInfo: ExistingBenefitsInfo
    bankInfo: BankInfo
    uploadedDocs: List[UploadedDocSummary]
    aiScore: int
    aiBreakdown: Optional[ScoreBreakdown] = None
    aiScreening: Optional[Dict[str, Any]] = None
    identityVerification: Optional[DocumentMatchScore] = None
    eligibilityEvaluationId: Optional[str] = None
    routingId: Optional[str] = None
    routingDecision: Optional[str] = None
    timeline: List[TimelineStep]
    adminRemarks: Optional[str] = None
    sanctionOrderNo: Optional[str] = None
    correctionDetails: Optional[str] = None

class ApplicationStatusUpdate(BaseModel):
    status: str  # "APPROVED" | "ACTION REQUIRED" | "REJECTED" | "UNDER REVIEW"
    adminRemarks: str
    sanctionOrderNo: Optional[str] = None
    correctionField: Optional[str] = None

# --- AUDIT LOG, PENSION HISTORY, SYSTEM UPDATES ---
class AuditLogModel(BaseModel):
    id: str
    adminId: str
    adminName: str
    action: str
    entity: str
    entityId: str
    description: str
    timestamp: str

class SystemUpdateModel(BaseModel):
    id: str
    titleEn: str
    titleTa: str
    descEn: str
    descTa: str
    category: str  # "New Scheme", "Requirement Change", "Important Notice", "Platform Update"
    date: str
    isPublished: bool = True
    publishedBy: str = "Admin"

class SystemUpdateCreate(BaseModel):
    titleEn: str
    titleTa: str
    descEn: str
    descTa: str
    category: str
    isPublished: bool = True

class PensionHistoryRecord(BaseModel):
    id: str
    userId: str
    schemeName: str
    period: str
    amount: int
    status: str  # "Disbursed", "Credited", "Processing"
    transactionRef: str
    date: str

# --- CHAT & NLP MODELS ---
class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    intent: Optional[str] = None
    timestamp: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    language: Optional[str] = "en"
    history: Optional[List[ChatMessage]] = []

class ChatResponse(BaseModel):
    reply: str
    intent: str
    suggestedActions: Optional[List[str]] = []
    quickReplies: Optional[List[str]] = []
