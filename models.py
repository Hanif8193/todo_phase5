# models.py
from sqlalchemy import Column, Integer, String, Date, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=True)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tasks = relationship("Task", back_populates="user")

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text, nullable=True)
    due_date = Column(Date, nullable=True, index=True)
    completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Nullable for backward compatibility
    priority = Column(String, default="medium", index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="tasks")

class RecurringRule(Base):
    __tablename__ = "recurring_rules"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    frequency = Column(String, nullable=False)  # "daily", "weekly", "monthly"
    interval = Column(Integer, default=1)  # Every N days/weeks/months
    weekdays = Column(String, nullable=True)  # Comma-separated: "1,3,5" for Mon,Wed,Fri
    day_of_month = Column(Integer, nullable=True)  # Day of month for monthly (1-31)
    priority = Column(String, default="medium")
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    max_occurrences = Column(Integer, nullable=True)
    timezone = Column(String, default="UTC")
    next_due = Column(Date, nullable=False)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", backref="recurring_rules")


class RecurringException(Base):
    __tablename__ = "recurring_exceptions"

    id = Column(Integer, primary_key=True, index=True)
    rule_id = Column(Integer, ForeignKey("recurring_rules.id"), nullable=False)
    exception_date = Column(Date, nullable=False)
    action = Column(String, nullable=False)   # "skip" | "postpone"
    new_date = Column(Date, nullable=True)    # only for postpone
    created_at = Column(DateTime, default=datetime.utcnow)
