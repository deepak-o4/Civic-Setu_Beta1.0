from pydantic import BaseModel, EmailStr, Field
from uuid import UUID

class OTPRequest(BaseModel):
    email: EmailStr

class OTPVerify(BaseModel):
    email: EmailStr
    otp: str = Field(..., pattern=r"^\d{6}$", description="6-digit verification code")

class SignupRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: str = Field(..., pattern=r"^\+?[1-9]\d{7,14}$", description="Mobile number in international format")
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters")
    role: str = Field("CITIZEN", description="Role: CITIZEN, OFFICER, etc.")

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: UUID
    name: str
    email: EmailStr
    role: str
    department: str | None = None

    class Config:
        from_attributes = True
