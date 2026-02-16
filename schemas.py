# schemas.py
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, Dict, Any
from datetime import date, datetime


# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    name: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    user: UserResponse
    token: str


# Task Schemas
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[date] = None
    priority: Optional[str] = Field("medium", pattern="^(low|medium|high)$")


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[date] = None
    completed: Optional[bool] = None
    priority: Optional[str] = Field(None, pattern="^(low|medium|high)$")


class TaskResponse(TaskBase):
    id: int
    completed: bool
    completed_at: Optional[datetime] = None
    user_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Recurring Rule Schemas
class RecurringRuleBase(BaseModel):
    title: str
    description: Optional[str] = None
    frequency: str = Field(..., pattern="^(daily|weekly|monthly)$")
    interval: int = Field(1, ge=1, le=365, description="Repeat every N days/weeks/months")
    weekdays: Optional[str] = Field(None, description="Comma-separated weekdays (0=Mon, 6=Sun): e.g. '0,2,4'")
    day_of_month: Optional[int] = Field(None, ge=1, le=31, description="Day of month for monthly recurrence")
    priority: Optional[str] = Field("medium", pattern="^(low|medium|high)$")
    next_due: date


class RecurringRuleCreate(RecurringRuleBase):
    pass


class RecurringRuleUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    frequency: Optional[str] = Field(None, pattern="^(daily|weekly|monthly)$")
    interval: Optional[int] = Field(None, ge=1, le=365)
    weekdays: Optional[str] = None
    day_of_month: Optional[int] = Field(None, ge=1, le=31)
    priority: Optional[str] = Field(None, pattern="^(low|medium|high)$")
    next_due: Optional[date] = None
    active: Optional[bool] = None


class RecurringRuleResponse(RecurringRuleBase):
    id: int
    user_id: int
    interval: int
    active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# New schemas matching E2E test spec
class RecurringPatternCreate(BaseModel):
    title: str
    description: Optional[str] = None
    recurrence_type: str = Field(..., pattern="^(daily|weekly|monthly)$")
    recurrence_rule: Dict[str, Any]          # {interval, weekdays?, month_day?}
    start_date: date
    end_date: Optional[date] = None
    max_occurrences: Optional[int] = None
    timezone: str = "UTC"
    user_id: int


class RecurringPatternUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    recurrence_type: Optional[str] = Field(None, pattern="^(daily|weekly|monthly)$")
    recurrence_rule: Optional[Dict[str, Any]] = None
    end_date: Optional[date] = None
    max_occurrences: Optional[int] = None
    timezone: Optional[str] = None


class RecurringPatternResponse(BaseModel):
    id: int
    title: Optional[str]
    description: Optional[str]
    recurrence_type: str
    recurrence_rule: Dict[str, Any]
    start_date: Optional[date]
    end_date: Optional[date]
    max_occurrences: Optional[int]
    timezone: Optional[str]
    user_id: int
    model_config = ConfigDict(from_attributes=True)


class NextOccurrencesRequest(BaseModel):
    count: int = 5
    from_date: Optional[date] = None


class ExceptionResponse(BaseModel):
    message: str
    exception_id: int
