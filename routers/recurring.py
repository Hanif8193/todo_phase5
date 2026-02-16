# routers/recurring.py
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, timedelta
from auth_utils import get_current_user, get_db
from schemas import (
    RecurringRuleCreate, RecurringRuleUpdate, RecurringRuleResponse,
    TaskResponse, RecurringPatternCreate, RecurringPatternUpdate,
    NextOccurrencesRequest, ExceptionResponse,
)
from models import User, RecurringRule, Task, RecurringException
from exceptions import NotFoundException, ForbiddenException

router = APIRouter(prefix="/api/tasks/recurring", tags=["Recurring Tasks"])


@router.get("/health")
def recurring_health():
    """Health check for recurring tasks router"""
    return {"status": "ok", "router": "recurring"}


def verify_rule_access(rule_id: int, current_user: User, db: Session) -> RecurringRule:
    """Verify that current user has access to the specified recurring rule"""
    rule = db.query(RecurringRule).filter(RecurringRule.id == rule_id).first()
    if not rule:
        raise NotFoundException(detail="Recurring rule not found")
    if rule.user_id != current_user.id:
        raise ForbiddenException(detail="You can only access your own recurring rules")
    return rule


def calculate_next_occurrence(rule: RecurringRule, from_date: date = None) -> date:
    """Calculate the next occurrence date for a recurring rule"""
    if from_date is None:
        from_date = rule.next_due

    if rule.frequency == "daily":
        return from_date + timedelta(days=rule.interval)

    elif rule.frequency == "weekly":
        # For weekly, advance by interval weeks
        next_date = from_date + timedelta(weeks=rule.interval)

        # If weekdays are specified, find next matching weekday
        if rule.weekdays:
            weekday_nums = [int(d) for d in rule.weekdays.split(",")]
            current_weekday = next_date.weekday()

            # Find next matching weekday
            days_ahead = None
            for target_weekday in sorted(weekday_nums):
                if target_weekday >= current_weekday:
                    days_ahead = target_weekday - current_weekday
                    break

            # If no matching weekday found this week, use first weekday next week
            if days_ahead is None:
                days_ahead = (7 - current_weekday) + weekday_nums[0]

            next_date = next_date + timedelta(days=days_ahead)

        return next_date

    elif rule.frequency == "monthly":
        # Advance by interval months
        year = from_date.year
        month = from_date.month + rule.interval

        # Handle year overflow
        while month > 12:
            month -= 12
            year += 1

        # Use specified day of month or same day
        day = rule.day_of_month if rule.day_of_month else from_date.day

        # Handle months with fewer days
        import calendar
        max_day = calendar.monthrange(year, month)[1]
        day = min(day, max_day)

        return date(year, month, day)

    return from_date


# Weekday name to number mapping (Monday=0 per Python convention)
WEEKDAY_MAP = {
    "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
    "friday": 4, "saturday": 5, "sunday": 6,
}
# Reverse map: number → name
WEEKDAY_NAMES = {v: k for k, v in WEEKDAY_MAP.items()}


def rule_to_pattern_response(rule: RecurringRule) -> dict:
    """Build the new-style pattern response dict from the flat RecurringRule model"""
    rec_rule: dict = {"interval": rule.interval}
    if rule.weekdays:
        nums = rule.weekdays.split(",") if isinstance(rule.weekdays, str) else list(rule.weekdays)
        rec_rule["weekdays"] = [WEEKDAY_NAMES.get(int(n), n) for n in nums]
    if rule.day_of_month:
        rec_rule["month_day"] = rule.day_of_month
    return {
        "id": rule.id,
        "title": rule.title,
        "description": rule.description,
        "recurrence_type": rule.frequency,
        "recurrence_rule": rec_rule,
        "start_date": rule.start_date.isoformat() if rule.start_date else None,
        "end_date": rule.end_date.isoformat() if rule.end_date else None,
        "max_occurrences": rule.max_occurrences,
        "timezone": rule.timezone or "UTC",
        "user_id": rule.user_id,
    }


@router.get("")
def get_recurring_rules(
    active_only: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all recurring rules for the authenticated user"""
    query = db.query(RecurringRule).filter(RecurringRule.user_id == current_user.id)

    if active_only:
        query = query.filter(RecurringRule.active == True)

    rules = query.order_by(RecurringRule.next_due.asc()).all()
    return [rule_to_pattern_response(r) for r in rules]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_recurring_rule(
    rule_data: RecurringPatternCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new recurring rule using the new pattern schema"""
    rec_rule = rule_data.recurrence_rule
    interval = rec_rule.get("interval", 1)

    # weekdays: list of strings like ["monday","wednesday"] → "0,2"
    weekdays_raw = rec_rule.get("weekdays")
    weekdays_str = None
    if weekdays_raw:
        nums = [str(WEEKDAY_MAP.get(w.lower(), w)) for w in weekdays_raw]
        weekdays_str = ",".join(nums)

    day_of_month = rec_rule.get("month_day")

    new_rule = RecurringRule(
        user_id=current_user.id,
        title=rule_data.title,
        description=rule_data.description,
        frequency=rule_data.recurrence_type,
        interval=interval,
        weekdays=weekdays_str,
        day_of_month=day_of_month,
        start_date=rule_data.start_date,
        end_date=rule_data.end_date,
        max_occurrences=rule_data.max_occurrences,
        timezone=rule_data.timezone,
        next_due=rule_data.start_date,
        active=True,
    )

    db.add(new_rule)
    db.commit()
    db.refresh(new_rule)

    return rule_to_pattern_response(new_rule)


@router.get("/{rule_id}")
def get_recurring_rule(
    rule_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific recurring rule"""
    rule = verify_rule_access(rule_id, current_user, db)
    return rule_to_pattern_response(rule)


@router.put("/{rule_id}")
def update_recurring_rule(
    rule_id: int,
    rule_data: RecurringPatternUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a recurring rule"""
    rule = verify_rule_access(rule_id, current_user, db)

    if rule_data.title is not None:
        rule.title = rule_data.title
    if rule_data.description is not None:
        rule.description = rule_data.description
    if rule_data.recurrence_type is not None:
        rule.frequency = rule_data.recurrence_type
    if rule_data.recurrence_rule is not None:
        rec = rule_data.recurrence_rule
        if "interval" in rec:
            rule.interval = rec["interval"]
        if "weekdays" in rec:
            weekdays_raw = rec["weekdays"]
            nums = [str(WEEKDAY_MAP.get(w.lower(), w)) for w in weekdays_raw]
            rule.weekdays = ",".join(nums)
        if "month_day" in rec:
            rule.day_of_month = rec["month_day"]
    if rule_data.end_date is not None:
        rule.end_date = rule_data.end_date
    if rule_data.max_occurrences is not None:
        rule.max_occurrences = rule_data.max_occurrences
    if rule_data.timezone is not None:
        rule.timezone = rule_data.timezone

    db.commit()
    db.refresh(rule)

    return rule_to_pattern_response(rule)


@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recurring_rule(
    rule_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a recurring rule"""
    rule = verify_rule_access(rule_id, current_user, db)

    db.delete(rule)
    db.commit()

    return None


@router.post("/{rule_id}/next-occurrences", status_code=status.HTTP_200_OK)
def get_next_occurrences(
    rule_id: int,
    request: NextOccurrencesRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Calculate next N occurrences for a recurring rule"""
    rule = verify_rule_access(rule_id, current_user, db)

    from_date = request.from_date if request.from_date else rule.next_due
    count = max(1, request.count)

    occurrences = []
    current = from_date
    for _ in range(count):
        occurrences.append(current.isoformat())
        current = calculate_next_occurrence(rule, from_date=current)

    return occurrences


@router.post("/{rule_id}/skip", status_code=status.HTTP_201_CREATED)
def skip_occurrence(
    rule_id: int,
    occurrence_date: date = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Skip a specific occurrence of a recurring rule"""
    rule = verify_rule_access(rule_id, current_user, db)

    exc = RecurringException(
        rule_id=rule.id,
        exception_date=occurrence_date,
        action="skip",
    )
    db.add(exc)
    db.commit()
    db.refresh(exc)

    return ExceptionResponse(
        message=f"Occurrence {occurrence_date} skipped",
        exception_id=exc.id,
    )


@router.post("/{rule_id}/postpone", status_code=status.HTTP_201_CREATED)
def postpone_occurrence(
    rule_id: int,
    occurrence_date: date = Query(...),
    new_date: date = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Postpone a specific occurrence of a recurring rule to a new date"""
    rule = verify_rule_access(rule_id, current_user, db)

    exc = RecurringException(
        rule_id=rule.id,
        exception_date=occurrence_date,
        action="postpone",
        new_date=new_date,
    )
    db.add(exc)
    db.commit()
    db.refresh(exc)

    return ExceptionResponse(
        message=f"Occurrence {occurrence_date} postponed to {new_date}",
        exception_id=exc.id,
    )


@router.post("/{rule_id}/generate", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def generate_task_from_rule(
    rule_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate a task from a recurring rule and update the next occurrence"""
    rule = verify_rule_access(rule_id, current_user, db)

    # Create task from rule
    new_task = Task(
        user_id=current_user.id,
        title=rule.title,
        description=rule.description,
        due_date=rule.next_due,
        priority=rule.priority,
        completed=False
    )

    # Calculate next occurrence
    next_occurrence = calculate_next_occurrence(rule)
    rule.next_due = next_occurrence

    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    return new_task


@router.post("/generate-due", response_model=List[TaskResponse])
def generate_due_tasks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate tasks from all active recurring rules that are due"""
    today = date.today()

    # Get all active rules where next_due <= today
    due_rules = db.query(RecurringRule).filter(
        RecurringRule.user_id == current_user.id,
        RecurringRule.active == True,
        RecurringRule.next_due <= today
    ).all()

    created_tasks = []

    for rule in due_rules:
        # Create task from rule
        new_task = Task(
            user_id=current_user.id,
            title=rule.title,
            description=rule.description,
            due_date=rule.next_due,
            priority=rule.priority,
            completed=False
        )

        # Calculate next occurrence
        next_occurrence = calculate_next_occurrence(rule)
        rule.next_due = next_occurrence

        db.add(new_task)
        created_tasks.append(new_task)

    if created_tasks:
        db.commit()
        for task in created_tasks:
            db.refresh(task)

    return created_tasks
