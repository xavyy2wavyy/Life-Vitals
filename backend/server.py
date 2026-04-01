from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'life_dashboard')]

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

# Daily Entry Base - All trackers inherit this structure
class DailyEntryBase(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str  # YYYY-MM-DD format
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# ========== CATEGORY MODELS ==========
class HabitCategory(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    key: str  # unique key like 'health', 'custom_1'
    label: str  # Display name
    color: str  # Hex color
    icon: str  # Icon name
    is_default: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class CategoryCreate(BaseModel):
    label: str
    color: str
    icon: str

# ========== HABIT MODELS ==========
class HabitBase(BaseModel):
    name: str
    category: str = "personal"
    icon: str = "star"

class HabitCreate(HabitBase):
    pass

class Habit(HabitBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    streak: int = 0
    best_streak: int = 0
    total_completions: int = 0

class HabitLog(DailyEntryBase):
    habit_id: str
    completed: bool = False
    completion_time: Optional[datetime] = None
    notes: Optional[str] = None

class HabitHistory(BaseModel):
    habit_id: str
    date: str
    completed: bool
    completion_time: Optional[str] = None

# ========== MOOD MODELS ==========
class MoodEntry(DailyEntryBase):
    mood_level: int = Field(ge=1, le=10)
    emoji: str = "😊"
    notes: Optional[str] = None
    factors: List[str] = []  # e.g., ["work", "sleep", "exercise"]

class MoodCreate(BaseModel):
    date: str
    mood_level: int = Field(ge=1, le=10)
    emoji: str = "😊"
    notes: Optional[str] = None
    factors: List[str] = []

# ========== WATER MODELS ==========
class WaterEntry(DailyEntryBase):
    cups: int = 0
    goal: int = 8
    logs: List[Dict[str, Any]] = []  # [{time: "14:30", cups: 1}, ...]

class WaterLog(BaseModel):
    time: str
    cups: int

# ========== NUTRITION MODELS ==========
class MealEntry(DailyEntryBase):
    name: str
    calories: int
    protein: int = 0
    carbs: int = 0
    fats: int = 0
    meal_type: str = "snack"
    time: Optional[str] = None

class MealCreate(BaseModel):
    date: str
    name: str
    calories: int
    protein: int = 0
    carbs: int = 0
    fats: int = 0
    meal_type: str = "snack"
    time: Optional[str] = None

class DailyNutritionSummary(BaseModel):
    date: str
    total_calories: int = 0
    total_protein: int = 0
    total_carbs: int = 0
    total_fats: int = 0
    meal_count: int = 0
    calorie_goal: int = 2000
    meals: List[MealEntry] = []

# ========== FITNESS MODELS ==========
class Exercise(BaseModel):
    name: str
    sets: int
    reps: int
    weight: float = 0
    notes: Optional[str] = None

class WorkoutEntry(DailyEntryBase):
    workout_type: str
    exercises: List[Exercise] = []
    notes: Optional[str] = None
    duration_minutes: int = 0
    calories_burned: int = 0

class WorkoutCreate(BaseModel):
    date: str
    workout_type: str
    exercises: List[Exercise] = []
    notes: Optional[str] = None
    duration_minutes: int = 0
    calories_burned: int = 0

# ========== LAUNDRY MODELS ==========
class LaundryEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category: str  # clothes, bedding, gym_clothes, or custom
    last_done: str  # YYYY-MM-DD
    frequency_days: int = 7  # Expected frequency
    notes: Optional[str] = None
    history: List[Dict[str, str]] = []  # [{date: "2025-07-17", notes: "..."}, ...]
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class LaundryUpdate(BaseModel):
    category: str
    last_done: str
    notes: Optional[str] = None

class LaundryCategory(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    icon: str = "basket"
    frequency_days: int = 7
    created_at: datetime = Field(default_factory=datetime.utcnow)

# ========== CALENDAR MODELS ==========
class CalendarEvent(DailyEntryBase):
    title: str
    time: Optional[str] = None
    end_time: Optional[str] = None
    category: str = "personal"
    description: Optional[str] = None
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = None  # daily, weekly, monthly

class CalendarEventCreate(BaseModel):
    title: str
    date: str
    time: Optional[str] = None
    end_time: Optional[str] = None
    category: str = "personal"
    description: Optional[str] = None
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = None

# ========== JOURNAL MODELS ==========
class JournalEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str  # YYYY-MM-DD
    tracker_type: str = "journal"
    content: str
    images: List[str] = []  # Array of base64 image data
    mood: Optional[str] = None  # Emoji
    tags: List[str] = []
    prompt: Optional[str] = None  # The daily prompt used
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class JournalEntryCreate(BaseModel):
    date: str
    content: str
    images: List[str] = []
    mood: Optional[str] = None
    tags: List[str] = []
    prompt: Optional[str] = None

class JournalEntryUpdate(BaseModel):
    content: Optional[str] = None
    images: Optional[List[str]] = None
    mood: Optional[str] = None
    tags: Optional[List[str]] = None

# Daily prompts for journaling
JOURNAL_PROMPTS = [
    "What made you feel good today?",
    "What are you grateful for right now?",
    "Describe a moment that made you smile today.",
    "What's something you learned recently?",
    "What's on your mind right now?",
    "How did you take care of yourself today?",
    "What's a challenge you overcame recently?",
    "Describe your perfect day.",
    "What are you looking forward to?",
    "What's something you want to remember about today?",
    "How are you feeling in this moment?",
    "What's inspiring you lately?",
    "Write about someone who made a difference in your day.",
    "What would make tomorrow great?",
    "Reflect on your progress this week.",
]

# ==================== API ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "Life Dashboard API", "status": "running", "version": "2.0"}

# ========== HABIT CATEGORIES ==========
@api_router.get("/categories/habits")
async def get_habit_categories():
    categories = await db.habit_categories.find().to_list(100)
    if not categories:
        # Initialize default categories
        defaults = [
            HabitCategory(key="health", label="Health", color="#EC4899", icon="heart", is_default=True),
            HabitCategory(key="personal", label="Personal", color="#8B5CF6", icon="person", is_default=True),
            HabitCategory(key="productivity", label="Productivity", color="#3B82F6", icon="rocket", is_default=True),
        ]
        for cat in defaults:
            await db.habit_categories.insert_one(cat.dict())
        return defaults
    return [HabitCategory(**c) for c in categories]

@api_router.post("/categories/habits", response_model=HabitCategory)
async def create_habit_category(category: CategoryCreate):
    key = f"custom_{str(uuid.uuid4())[:8]}"
    cat_obj = HabitCategory(
        key=key,
        label=category.label,
        color=category.color,
        icon=category.icon,
        is_default=False
    )
    await db.habit_categories.insert_one(cat_obj.dict())
    return cat_obj

@api_router.delete("/categories/habits/{category_key}")
async def delete_habit_category(category_key: str):
    result = await db.habit_categories.delete_one({"key": category_key, "is_default": False})
    if result.deleted_count == 0:
        raise HTTPException(status_code=400, detail="Cannot delete default category or category not found")
    return {"message": "Category deleted"}

# ========== HABITS ==========
@api_router.get("/habits", response_model=List[Habit])
async def get_habits():
    habits = await db.habits.find().to_list(100)
    return [Habit(**{**h, "id": str(h.get("_id", h.get("id")))}) for h in habits]

@api_router.post("/habits", response_model=Habit)
async def create_habit(habit: HabitCreate):
    habit_obj = Habit(**habit.dict())
    await db.habits.insert_one(habit_obj.dict())
    return habit_obj

@api_router.delete("/habits/{habit_id}")
async def delete_habit(habit_id: str):
    await db.habits.delete_one({"id": habit_id})
    await db.habit_logs.delete_many({"habit_id": habit_id})
    return {"message": "Habit deleted"}

@api_router.get("/habits/logs/{date}")
async def get_habit_logs(date: str):
    logs = await db.habit_logs.find({"date": date}).to_list(100)
    return [HabitLog(**log) for log in logs]

@api_router.post("/habits/log")
async def log_habit(habit_id: str, date: str, completed: bool = True, notes: Optional[str] = None):
    existing = await db.habit_logs.find_one({"habit_id": habit_id, "date": date})
    now = datetime.utcnow()
    
    if existing:
        await db.habit_logs.update_one(
            {"habit_id": habit_id, "date": date},
            {"$set": {
                "completed": completed,
                "completion_time": now if completed else None,
                "notes": notes,
                "updated_at": now
            }}
        )
    else:
        log = HabitLog(
            habit_id=habit_id, 
            date=date, 
            completed=completed,
            completion_time=now if completed else None,
            notes=notes
        )
        await db.habit_logs.insert_one(log.dict())
    
    # Update streak and stats
    habit = await db.habits.find_one({"id": habit_id})
    if habit:
        if completed:
            # Calculate streak
            yesterday = (datetime.strptime(date, "%Y-%m-%d") - timedelta(days=1)).strftime("%Y-%m-%d")
            yesterday_log = await db.habit_logs.find_one({"habit_id": habit_id, "date": yesterday, "completed": True})
            
            if yesterday_log:
                new_streak = habit.get("streak", 0) + 1
            else:
                new_streak = 1
            
            best_streak = max(habit.get("best_streak", 0), new_streak)
            total_completions = habit.get("total_completions", 0) + 1
            
            await db.habits.update_one(
                {"id": habit_id}, 
                {"$set": {
                    "streak": new_streak,
                    "best_streak": best_streak,
                    "total_completions": total_completions
                }}
            )
        else:
            await db.habits.update_one({"id": habit_id}, {"$set": {"streak": 0}})
    
    return {"message": "Habit logged", "completed": completed}

@api_router.get("/habits/history/{habit_id}")
async def get_habit_history(habit_id: str, days: int = 30):
    """Get habit completion history for the last N days"""
    today = datetime.now()
    dates = [(today - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(days)]
    
    logs = await db.habit_logs.find({
        "habit_id": habit_id,
        "date": {"$in": dates}
    }).to_list(days)
    
    history = []
    for date in dates:
        log = next((l for l in logs if l.get("date") == date), None)
        history.append(HabitHistory(
            habit_id=habit_id,
            date=date,
            completed=log.get("completed", False) if log else False,
            completion_time=log.get("completion_time").isoformat() if log and log.get("completion_time") else None
        ))
    
    return history

@api_router.get("/habits/weekly/{start_date}")
async def get_weekly_habits(start_date: str):
    start = datetime.strptime(start_date, "%Y-%m-%d")
    dates = [(start + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(7)]
    
    logs = await db.habit_logs.find({"date": {"$in": dates}}).to_list(1000)
    habits = await db.habits.find().to_list(100)
    
    return {
        "dates": dates,
        "habits": [Habit(**{**h, "id": str(h.get("_id", h.get("id")))}) for h in habits],
        "logs": [HabitLog(**log) for log in logs]
    }

# ========== MOOD ==========
@api_router.get("/mood/{date}")
async def get_mood(date: str):
    mood = await db.mood_entries.find_one({"date": date})
    if mood:
        return MoodEntry(**mood)
    return None

@api_router.get("/mood/history/{days}")
async def get_mood_history(days: int = 30):
    today = datetime.now()
    dates = [(today - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(days)]
    moods = await db.mood_entries.find({"date": {"$in": dates}}).sort("date", -1).to_list(days)
    return [MoodEntry(**m) for m in moods]

@api_router.post("/mood", response_model=MoodEntry)
async def log_mood(mood: MoodCreate):
    now = datetime.utcnow()
    existing = await db.mood_entries.find_one({"date": mood.date})
    if existing:
        await db.mood_entries.update_one(
            {"date": mood.date},
            {"$set": {**mood.dict(), "updated_at": now}}
        )
        updated = await db.mood_entries.find_one({"date": mood.date})
        return MoodEntry(**updated)
    else:
        mood_obj = MoodEntry(**mood.dict())
        await db.mood_entries.insert_one(mood_obj.dict())
        return mood_obj

@api_router.get("/mood/stats/{days}")
async def get_mood_stats(days: int = 30):
    """Get mood statistics for the last N days"""
    today = datetime.now()
    dates = [(today - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(days)]
    moods = await db.mood_entries.find({"date": {"$in": dates}}).to_list(days)
    
    if not moods:
        return {"average": 0, "highest": 0, "lowest": 0, "total_entries": 0}
    
    levels = [m.get("mood_level", 5) for m in moods]
    return {
        "average": round(sum(levels) / len(levels), 1),
        "highest": max(levels),
        "lowest": min(levels),
        "total_entries": len(moods)
    }

# ========== WATER ==========
@api_router.get("/water/{date}")
async def get_water(date: str):
    water = await db.water_entries.find_one({"date": date})
    if water:
        return WaterEntry(**water)
    return WaterEntry(date=date, cups=0, goal=8, logs=[])

@api_router.post("/water/{date}/add")
async def add_water(date: str, cups: int = 1):
    now = datetime.utcnow()
    time_str = now.strftime("%H:%M")
    
    existing = await db.water_entries.find_one({"date": date})
    if existing:
        new_cups = existing.get("cups", 0) + cups
        logs = existing.get("logs", [])
        logs.append({"time": time_str, "cups": cups})
        
        await db.water_entries.update_one(
            {"date": date},
            {"$set": {"cups": new_cups, "logs": logs, "updated_at": now}}
        )
        return {"cups": new_cups, "goal": existing.get("goal", 8), "logs": logs}
    else:
        entry = WaterEntry(
            date=date, 
            cups=cups, 
            goal=8,
            logs=[{"time": time_str, "cups": cups}]
        )
        await db.water_entries.insert_one(entry.dict())
        return {"cups": cups, "goal": 8, "logs": entry.logs}

@api_router.post("/water/{date}/set")
async def set_water(date: str, cups: int):
    now = datetime.utcnow()
    existing = await db.water_entries.find_one({"date": date})
    if existing:
        await db.water_entries.update_one(
            {"date": date}, 
            {"$set": {"cups": cups, "updated_at": now}}
        )
    else:
        entry = WaterEntry(date=date, cups=cups, goal=8)
        await db.water_entries.insert_one(entry.dict())
    return {"cups": cups, "goal": 8}

@api_router.post("/water/{date}/goal")
async def set_water_goal(date: str, goal: int):
    existing = await db.water_entries.find_one({"date": date})
    if existing:
        await db.water_entries.update_one({"date": date}, {"$set": {"goal": goal}})
    else:
        entry = WaterEntry(date=date, cups=0, goal=goal)
        await db.water_entries.insert_one(entry.dict())
    return {"goal": goal}

@api_router.get("/water/history/{days}")
async def get_water_history(days: int = 7):
    today = datetime.now()
    dates = [(today - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(days)]
    entries = await db.water_entries.find({"date": {"$in": dates}}).to_list(days)
    
    history = []
    for date in dates:
        entry = next((e for e in entries if e.get("date") == date), None)
        history.append({
            "date": date,
            "cups": entry.get("cups", 0) if entry else 0,
            "goal": entry.get("goal", 8) if entry else 8
        })
    return history

# ========== NUTRITION ==========
@api_router.get("/nutrition/{date}")
async def get_meals(date: str):
    meals = await db.meal_entries.find({"date": date}).sort("created_at", 1).to_list(100)
    return [MealEntry(**m) for m in meals]

@api_router.post("/nutrition", response_model=MealEntry)
async def add_meal(meal: MealCreate):
    now = datetime.utcnow()
    meal_obj = MealEntry(
        **meal.dict(),
        time=meal.time or now.strftime("%H:%M")
    )
    await db.meal_entries.insert_one(meal_obj.dict())
    return meal_obj

@api_router.delete("/nutrition/{meal_id}")
async def delete_meal(meal_id: str):
    await db.meal_entries.delete_one({"id": meal_id})
    return {"message": "Meal deleted"}

@api_router.get("/nutrition/summary/{date}")
async def get_nutrition_summary(date: str):
    meals = await db.meal_entries.find({"date": date}).to_list(100)
    return DailyNutritionSummary(
        date=date,
        total_calories=sum(m.get("calories", 0) for m in meals),
        total_protein=sum(m.get("protein", 0) for m in meals),
        total_carbs=sum(m.get("carbs", 0) for m in meals),
        total_fats=sum(m.get("fats", 0) for m in meals),
        meal_count=len(meals),
        meals=[MealEntry(**m) for m in meals]
    )

@api_router.get("/nutrition/history/{days}")
async def get_nutrition_history(days: int = 7):
    today = datetime.now()
    dates = [(today - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(days)]
    
    history = []
    for date in dates:
        meals = await db.meal_entries.find({"date": date}).to_list(100)
        history.append({
            "date": date,
            "total_calories": sum(m.get("calories", 0) for m in meals),
            "total_protein": sum(m.get("protein", 0) for m in meals),
            "total_carbs": sum(m.get("carbs", 0) for m in meals),
            "total_fats": sum(m.get("fats", 0) for m in meals),
            "meal_count": len(meals)
        })
    return history

# ========== FITNESS ==========
@api_router.get("/fitness/history/{days}")
async def get_workout_history(days: int = 30):
    today = datetime.now()
    dates = [(today - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(days)]
    workouts = await db.workout_entries.find({"date": {"$in": dates}}).sort("date", -1).to_list(100)
    return [WorkoutEntry(**w) for w in workouts]

@api_router.get("/fitness/stats/{days}")
async def get_fitness_stats(days: int = 30):
    today = datetime.now()
    dates = [(today - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(days)]
    workouts = await db.workout_entries.find({"date": {"$in": dates}}).to_list(100)
    
    workout_types = {}
    for w in workouts:
        wt = w.get("workout_type", "Unknown")
        workout_types[wt] = workout_types.get(wt, 0) + 1
    
    return {
        "total_workouts": len(workouts),
        "total_duration": sum(w.get("duration_minutes", 0) for w in workouts),
        "workout_types": workout_types,
        "workouts_per_week": round(len(workouts) / (days / 7), 1)
    }

# ========== LAUNDRY ==========
@api_router.get("/laundry")
async def get_laundry():
    entries = await db.laundry_entries.find().to_list(20)
    if not entries:
        today = datetime.now().strftime("%Y-%m-%d")
        defaults = [
            LaundryEntry(category="clothes", last_done=today, frequency_days=7, history=[{"date": today}]),
            LaundryEntry(category="bedding", last_done=today, frequency_days=14, history=[{"date": today}]),
            LaundryEntry(category="gym_clothes", last_done=today, frequency_days=3, history=[{"date": today}]),
        ]
        for d in defaults:
            await db.laundry_entries.insert_one(d.dict())
        return defaults
    return [LaundryEntry(**e) for e in entries]

@api_router.post("/laundry")
async def update_laundry(laundry: LaundryUpdate):
    now = datetime.utcnow()
    existing = await db.laundry_entries.find_one({"category": laundry.category})
    
    if existing:
        history = existing.get("history", [])
        history.append({
            "date": laundry.last_done,
            "notes": laundry.notes,
            "timestamp": now.isoformat()
        })
        
        await db.laundry_entries.update_one(
            {"category": laundry.category},
            {"$set": {
                "last_done": laundry.last_done, 
                "notes": laundry.notes,
                "history": history,
                "updated_at": now
            }}
        )
    else:
        entry = LaundryEntry(
            category=laundry.category,
            last_done=laundry.last_done,
            notes=laundry.notes,
            history=[{"date": laundry.last_done, "notes": laundry.notes}]
        )
        await db.laundry_entries.insert_one(entry.dict())
    return {"message": "Laundry updated"}

@api_router.post("/laundry/category")
async def create_laundry_category(name: str, icon: str = "basket", frequency_days: int = 7):
    today = datetime.now().strftime("%Y-%m-%d")
    entry = LaundryEntry(
        category=name.lower().replace(" ", "_"),
        last_done=today,
        frequency_days=frequency_days,
        history=[{"date": today}]
    )
    await db.laundry_entries.insert_one(entry.dict())
    return entry

@api_router.delete("/laundry/{category}")
async def delete_laundry_category(category: str):
    result = await db.laundry_entries.delete_one({"category": category})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted"}

@api_router.get("/laundry/history/{category}")
async def get_laundry_history(category: str):
    entry = await db.laundry_entries.find_one({"category": category})
    if not entry:
        return []
    return entry.get("history", [])

# ========== CALENDAR ==========
@api_router.get("/calendar/{month}")
async def get_calendar_events(month: str):
    events = await db.calendar_events.find({"date": {"$regex": f"^{month}"}}).to_list(100)
    return [CalendarEvent(**e) for e in events]

@api_router.get("/calendar/date/{date}")
async def get_events_by_date(date: str):
    events = await db.calendar_events.find({"date": date}).to_list(100)
    return [CalendarEvent(**e) for e in events]

@api_router.post("/calendar", response_model=CalendarEvent)
async def create_event(event: CalendarEventCreate):
    event_obj = CalendarEvent(**event.dict())
    await db.calendar_events.insert_one(event_obj.dict())
    return event_obj

@api_router.delete("/calendar/{event_id}")
async def delete_event(event_id: str):
    await db.calendar_events.delete_one({"id": event_id})
    return {"message": "Event deleted"}

# ========== JOURNAL ==========
@api_router.get("/journal/prompt")
async def get_daily_prompt():
    """Get a daily journaling prompt"""
    import random
    # Use date to get consistent prompt for the day
    today = datetime.now().strftime("%Y-%m-%d")
    seed = int(today.replace("-", ""))
    random.seed(seed)
    prompt = random.choice(JOURNAL_PROMPTS)
    return {"prompt": prompt, "date": today}

@api_router.get("/journal")
async def get_journal_entries(limit: int = 50, offset: int = 0):
    """Get journal entries, newest first"""
    entries = await db.journal_entries.find().sort("created_at", -1).skip(offset).limit(limit).to_list(limit)
    total = await db.journal_entries.count_documents({})
    return {
        "entries": [JournalEntry(**e) for e in entries],
        "total": total,
        "limit": limit,
        "offset": offset
    }

@api_router.get("/journal/date/{date}")
async def get_journal_entries_by_date(date: str):
    """Get journal entries for a specific date"""
    entries = await db.journal_entries.find({"date": date}).sort("created_at", -1).to_list(100)
    return [JournalEntry(**e) for e in entries]

@api_router.get("/journal/{entry_id}")
async def get_journal_entry(entry_id: str):
    """Get a single journal entry"""
    entry = await db.journal_entries.find_one({"id": entry_id})
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return JournalEntry(**entry)

@api_router.post("/journal", response_model=JournalEntry)
async def create_journal_entry(entry: JournalEntryCreate):
    """Create a new journal entry"""
    entry_obj = JournalEntry(**entry.dict())
    await db.journal_entries.insert_one(entry_obj.dict())
    return entry_obj

@api_router.put("/journal/{entry_id}")
async def update_journal_entry(entry_id: str, update: JournalEntryUpdate):
    """Update a journal entry"""
    entry = await db.journal_entries.find_one({"id": entry_id})
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    await db.journal_entries.update_one({"id": entry_id}, {"$set": update_data})
    updated = await db.journal_entries.find_one({"id": entry_id})
    return JournalEntry(**updated)

@api_router.delete("/journal/{entry_id}")
async def delete_journal_entry(entry_id: str):
    """Delete a journal entry"""
    result = await db.journal_entries.delete_one({"id": entry_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"message": "Entry deleted"}

@api_router.get("/journal/tags/all")
async def get_all_journal_tags():
    """Get all unique tags used in journal entries"""
    entries = await db.journal_entries.find({}, {"tags": 1}).to_list(1000)
    all_tags = set()
    for entry in entries:
        all_tags.update(entry.get("tags", []))
    return {"tags": sorted(list(all_tags))}

@api_router.get("/journal/filter/tag/{tag}")
async def get_journal_entries_by_tag(tag: str, limit: int = 50):
    """Get journal entries filtered by tag"""
    entries = await db.journal_entries.find({"tags": tag}).sort("created_at", -1).limit(limit).to_list(limit)
    return [JournalEntry(**e) for e in entries]

# ========== DASHBOARD SUMMARY ==========
@api_router.get("/dashboard/{date}")
async def get_dashboard_summary(date: str):
    # Habits
    habits = await db.habits.find().to_list(100)
    habit_logs = await db.habit_logs.find({"date": date}).to_list(100)
    completed_habits = len([l for l in habit_logs if l.get("completed", False)])
    total_habits = len(habits)
    
    # Water
    water = await db.water_entries.find_one({"date": date})
    water_cups = water.get("cups", 0) if water else 0
    water_goal = water.get("goal", 8) if water else 8
    
    # Nutrition
    meals = await db.meal_entries.find({"date": date}).to_list(100)
    total_calories = sum(m.get("calories", 0) for m in meals)
    
    # Mood
    mood = await db.mood_entries.find_one({"date": date})
    mood_data = MoodEntry(**mood) if mood else None
    
    # Workouts
    workouts = await db.workout_entries.find({"date": date}).to_list(10)
    
    # Laundry
    laundry_items = await db.laundry_entries.find().to_list(10)
    overdue_laundry = 0
    for item in laundry_items:
        last_done = datetime.strptime(item.get("last_done", date), "%Y-%m-%d")
        today_date = datetime.strptime(date, "%Y-%m-%d")
        days_since = (today_date - last_done).days
        if days_since >= item.get("frequency_days", 7):
            overdue_laundry += 1
    
    # Journal entries
    journal_entries = await db.journal_entries.find({"date": date}).to_list(10)
    
    return {
        "date": date,
        "habits": {
            "completed": completed_habits,
            "total": total_habits,
            "percentage": round((completed_habits / total_habits * 100) if total_habits > 0 else 0)
        },
        "water": {
            "cups": water_cups,
            "goal": water_goal,
            "percentage": round((water_cups / water_goal * 100) if water_goal > 0 else 0)
        },
        "nutrition": {
            "calories": total_calories,
            "goal": 2000,
            "meals": len(meals)
        },
        "mood": mood_data,
        "fitness": {
            "workouts_today": len(workouts)
        },
        "laundry": {
            "overdue_count": overdue_laundry
        },
        "journal": {
            "entries_today": len(journal_entries)
        }
    }

# ========== SEED / MOCK DATA ==========
@api_router.post("/seed")
async def seed_mock_data():
    """Seed the database with mock data for testing"""
    today = datetime.now()
    today_str = today.strftime("%Y-%m-%d")
    
    # Clear existing data (optional - comment out to keep existing)
    # await db.habits.delete_many({})
    # await db.habit_logs.delete_many({})
    # etc.
    
    # Check if already seeded
    existing_habits = await db.habits.count_documents({})
    if existing_habits > 3:
        return {"message": "Data already seeded", "status": "skipped"}
    
    # Seed Habits
    habits_data = [
        {"name": "Drink 8 glasses of water", "category": "health", "icon": "water", "streak": 5, "best_streak": 12, "total_completions": 45},
        {"name": "Morning meditation", "category": "personal", "icon": "heart", "streak": 3, "best_streak": 7, "total_completions": 28},
        {"name": "Read for 30 minutes", "category": "productivity", "icon": "book", "streak": 7, "best_streak": 14, "total_completions": 62},
        {"name": "Exercise", "category": "health", "icon": "fitness", "streak": 2, "best_streak": 10, "total_completions": 35},
        {"name": "No social media", "category": "productivity", "icon": "phone-portrait", "streak": 1, "best_streak": 5, "total_completions": 18},
    ]
    
    for h in habits_data:
        habit = Habit(**h)
        await db.habits.insert_one(habit.dict())
        # Add some completion logs
        for i in range(min(h["streak"], 7)):
            date = (today - timedelta(days=i)).strftime("%Y-%m-%d")
            log = HabitLog(habit_id=habit.id, date=date, completed=True)
            await db.habit_logs.insert_one(log.dict())
    
    # Seed Water entries for last 7 days
    for i in range(7):
        date = (today - timedelta(days=i)).strftime("%Y-%m-%d")
        cups = 4 + (i % 5)  # Vary between 4-8 cups
        water = WaterEntry(date=date, cups=cups, goal=8, logs=[{"time": "09:00", "cups": 2}, {"time": "14:00", "cups": cups - 2}])
        existing = await db.water_entries.find_one({"date": date})
        if not existing:
            await db.water_entries.insert_one(water.dict())
    
    # Seed Nutrition entries
    meals_data = [
        {"name": "Oatmeal with berries", "calories": 320, "protein": 12, "carbs": 45, "fats": 8, "meal_type": "breakfast"},
        {"name": "Grilled chicken salad", "calories": 450, "protein": 35, "carbs": 20, "fats": 15, "meal_type": "lunch"},
        {"name": "Protein smoothie", "calories": 280, "protein": 25, "carbs": 30, "fats": 5, "meal_type": "snack"},
        {"name": "Salmon with vegetables", "calories": 520, "protein": 40, "carbs": 25, "fats": 22, "meal_type": "dinner"},
    ]
    
    for m in meals_data:
        meal = MealEntry(date=today_str, **m)
        await db.meal_entries.insert_one(meal.dict())
    
    # Seed Fitness entries
    workouts_data = [
        {
            "workout_type": "Push",
            "exercises": [
                {"name": "Bench Press", "sets": 4, "reps": 10, "weight": 135},
                {"name": "Shoulder Press", "sets": 3, "reps": 12, "weight": 60},
                {"name": "Tricep Dips", "sets": 3, "reps": 15, "weight": 0},
            ],
            "duration_minutes": 45
        },
        {
            "workout_type": "Cardio",
            "exercises": [
                {"name": "Running", "sets": 1, "reps": 1, "weight": 0, "notes": "5K run"},
            ],
            "duration_minutes": 30
        }
    ]
    
    for i, w in enumerate(workouts_data):
        date = (today - timedelta(days=i)).strftime("%Y-%m-%d")
        workout = WorkoutEntry(date=date, **w)
        await db.workout_entries.insert_one(workout.dict())
    
    # Seed Mood entries for last 7 days
    moods = ["😄", "🙂", "😊", "😐", "🙂", "😄", "😊"]
    levels = [9, 7, 8, 5, 7, 9, 8]
    for i in range(7):
        date = (today - timedelta(days=i)).strftime("%Y-%m-%d")
        mood = MoodEntry(date=date, mood_level=levels[i], emoji=moods[i], notes="Feeling good!" if levels[i] > 6 else None)
        existing = await db.mood_entries.find_one({"date": date})
        if not existing:
            await db.mood_entries.insert_one(mood.dict())
    
    # Seed Journal entries
    journal_data = [
        {"content": "Today was a productive day. I managed to complete all my tasks and even had time for a workout. Feeling accomplished!", "mood": "😄", "tags": ["productive", "workout", "gratitude"]},
        {"content": "Started reading a new book on mindfulness. The concepts are fascinating and I'm trying to incorporate them into my daily routine.", "mood": "🙂", "tags": ["reading", "mindfulness", "personal-growth"]},
        {"content": "Had a great catch-up with an old friend. Sometimes these conversations remind me how important it is to maintain relationships.", "mood": "😊", "tags": ["friends", "social", "gratitude"]},
    ]
    
    for i, j in enumerate(journal_data):
        date = (today - timedelta(days=i)).strftime("%Y-%m-%d")
        entry = JournalEntry(date=date, content=j["content"], mood=j["mood"], tags=j["tags"], prompt=JOURNAL_PROMPTS[i % len(JOURNAL_PROMPTS)])
        await db.journal_entries.insert_one(entry.dict())
    
    # Seed Calendar events
    events_data = [
        {"title": "Team Meeting", "category": "work", "time": "10:00"},
        {"title": "Gym Session", "category": "personal", "time": "18:00"},
        {"title": "Project Deadline", "category": "work", "time": "17:00"},
        {"title": "Study Session", "category": "school", "time": "14:00"},
    ]
    
    for i, e in enumerate(events_data):
        date = (today + timedelta(days=i)).strftime("%Y-%m-%d")
        event = CalendarEvent(date=date, **e)
        await db.calendar_events.insert_one(event.dict())
    
    return {"message": "Mock data seeded successfully", "status": "success"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
