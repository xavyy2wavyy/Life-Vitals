from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, date
from bson import ObjectId

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

# Habit Models
class HabitBase(BaseModel):
    name: str
    category: str = "personal"  # health, personal, productivity
    icon: str = "star"

class HabitCreate(HabitBase):
    pass

class Habit(HabitBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    streak: int = 0

class HabitLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    habit_id: str
    date: str  # YYYY-MM-DD format
    completed: bool = False
    logged_at: datetime = Field(default_factory=datetime.utcnow)

# Mood Models
class MoodEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str  # YYYY-MM-DD
    mood_level: int = Field(ge=1, le=10)  # 1-10 scale
    emoji: str = "😊"
    notes: Optional[str] = None
    logged_at: datetime = Field(default_factory=datetime.utcnow)

class MoodCreate(BaseModel):
    date: str
    mood_level: int = Field(ge=1, le=10)
    emoji: str = "😊"
    notes: Optional[str] = None

# Water Tracker Models
class WaterEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str  # YYYY-MM-DD
    cups: int = 0  # Number of cups (1 cup = 8oz)
    goal: int = 8  # Daily goal in cups
    logged_at: datetime = Field(default_factory=datetime.utcnow)

class WaterUpdate(BaseModel):
    cups: int

# Nutrition Models
class MealEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str
    name: str
    calories: int
    protein: Optional[int] = 0
    carbs: Optional[int] = 0
    fats: Optional[int] = 0
    meal_type: str = "snack"  # breakfast, lunch, dinner, snack
    logged_at: datetime = Field(default_factory=datetime.utcnow)

class MealCreate(BaseModel):
    date: str
    name: str
    calories: int
    protein: Optional[int] = 0
    carbs: Optional[int] = 0
    fats: Optional[int] = 0
    meal_type: str = "snack"

# Fitness Models
class Exercise(BaseModel):
    name: str
    sets: int
    reps: int
    weight: Optional[float] = 0

class WorkoutEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str
    workout_type: str  # Push, Pull, Legs, Custom
    exercises: List[Exercise] = []
    notes: Optional[str] = None
    duration_minutes: Optional[int] = 0
    logged_at: datetime = Field(default_factory=datetime.utcnow)

class WorkoutCreate(BaseModel):
    date: str
    workout_type: str
    exercises: List[Exercise] = []
    notes: Optional[str] = None
    duration_minutes: Optional[int] = 0

# Laundry Models
class LaundryEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category: str  # clothes, bedding, gym_clothes
    last_done: str  # YYYY-MM-DD
    notes: Optional[str] = None
    logged_at: datetime = Field(default_factory=datetime.utcnow)

class LaundryUpdate(BaseModel):
    category: str
    last_done: str
    notes: Optional[str] = None

# Calendar Event Models
class CalendarEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    date: str  # YYYY-MM-DD
    time: Optional[str] = None  # HH:MM format
    category: str = "personal"  # work, school, personal, vanity
    description: Optional[str] = None
    logged_at: datetime = Field(default_factory=datetime.utcnow)

class CalendarEventCreate(BaseModel):
    title: str
    date: str
    time: Optional[str] = None
    category: str = "personal"
    description: Optional[str] = None

# ==================== API ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "Life Dashboard API", "status": "running"}

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
async def log_habit(habit_id: str, date: str, completed: bool = True):
    # Check if log exists
    existing = await db.habit_logs.find_one({"habit_id": habit_id, "date": date})
    if existing:
        await db.habit_logs.update_one(
            {"habit_id": habit_id, "date": date},
            {"$set": {"completed": completed}}
        )
    else:
        log = HabitLog(habit_id=habit_id, date=date, completed=completed)
        await db.habit_logs.insert_one(log.dict())
    
    # Update streak
    if completed:
        habit = await db.habits.find_one({"id": habit_id})
        if habit:
            new_streak = habit.get("streak", 0) + 1
            await db.habits.update_one({"id": habit_id}, {"$set": {"streak": new_streak}})
    
    return {"message": "Habit logged", "completed": completed}

@api_router.get("/habits/weekly/{start_date}")
async def get_weekly_habits(start_date: str):
    """Get habit completion data for a week starting from start_date"""
    from datetime import timedelta
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
async def get_mood_history(days: int = 7):
    from datetime import timedelta
    today = datetime.now()
    dates = [(today - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(days)]
    moods = await db.mood_entries.find({"date": {"$in": dates}}).to_list(days)
    return [MoodEntry(**m) for m in moods]

@api_router.post("/mood", response_model=MoodEntry)
async def log_mood(mood: MoodCreate):
    existing = await db.mood_entries.find_one({"date": mood.date})
    if existing:
        await db.mood_entries.update_one(
            {"date": mood.date},
            {"$set": mood.dict()}
        )
        updated = await db.mood_entries.find_one({"date": mood.date})
        return MoodEntry(**updated)
    else:
        mood_obj = MoodEntry(**mood.dict())
        await db.mood_entries.insert_one(mood_obj.dict())
        return mood_obj

# ========== WATER ==========
@api_router.get("/water/{date}")
async def get_water(date: str):
    water = await db.water_entries.find_one({"date": date})
    if water:
        return WaterEntry(**water)
    return WaterEntry(date=date, cups=0, goal=8)

@api_router.post("/water/{date}/add")
async def add_water(date: str, cups: int = 1):
    existing = await db.water_entries.find_one({"date": date})
    if existing:
        new_cups = existing.get("cups", 0) + cups
        await db.water_entries.update_one(
            {"date": date},
            {"$set": {"cups": new_cups}}
        )
        return {"cups": new_cups, "goal": existing.get("goal", 8)}
    else:
        entry = WaterEntry(date=date, cups=cups, goal=8)
        await db.water_entries.insert_one(entry.dict())
        return {"cups": cups, "goal": 8}

@api_router.post("/water/{date}/set")
async def set_water(date: str, cups: int):
    existing = await db.water_entries.find_one({"date": date})
    if existing:
        await db.water_entries.update_one({"date": date}, {"$set": {"cups": cups}})
    else:
        entry = WaterEntry(date=date, cups=cups, goal=8)
        await db.water_entries.insert_one(entry.dict())
    return {"cups": cups, "goal": 8}

# ========== NUTRITION ==========
@api_router.get("/nutrition/{date}")
async def get_meals(date: str):
    meals = await db.meal_entries.find({"date": date}).to_list(100)
    return [MealEntry(**m) for m in meals]

@api_router.post("/nutrition", response_model=MealEntry)
async def add_meal(meal: MealCreate):
    meal_obj = MealEntry(**meal.dict())
    await db.meal_entries.insert_one(meal_obj.dict())
    return meal_obj

@api_router.delete("/nutrition/{meal_id}")
async def delete_meal(meal_id: str):
    await db.meal_entries.delete_one({"id": meal_id})
    return {"message": "Meal deleted"}

@api_router.get("/nutrition/summary/{date}")
async def get_nutrition_summary(date: str):
    meals = await db.meal_entries.find({"date": date}).to_list(100)
    total_calories = sum(m.get("calories", 0) for m in meals)
    total_protein = sum(m.get("protein", 0) for m in meals)
    total_carbs = sum(m.get("carbs", 0) for m in meals)
    total_fats = sum(m.get("fats", 0) for m in meals)
    return {
        "total_calories": total_calories,
        "total_protein": total_protein,
        "total_carbs": total_carbs,
        "total_fats": total_fats,
        "meal_count": len(meals)
    }

# ========== FITNESS ==========
@api_router.get("/fitness/{date}")
async def get_workouts(date: str):
    workouts = await db.workout_entries.find({"date": date}).to_list(100)
    return [WorkoutEntry(**w) for w in workouts]

@api_router.get("/fitness/history/{days}")
async def get_workout_history(days: int = 30):
    from datetime import timedelta
    today = datetime.now()
    dates = [(today - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(days)]
    workouts = await db.workout_entries.find({"date": {"$in": dates}}).to_list(100)
    return [WorkoutEntry(**w) for w in workouts]

@api_router.post("/fitness", response_model=WorkoutEntry)
async def log_workout(workout: WorkoutCreate):
    workout_obj = WorkoutEntry(**workout.dict())
    await db.workout_entries.insert_one(workout_obj.dict())
    return workout_obj

@api_router.delete("/fitness/{workout_id}")
async def delete_workout(workout_id: str):
    await db.workout_entries.delete_one({"id": workout_id})
    return {"message": "Workout deleted"}

# ========== LAUNDRY ==========
@api_router.get("/laundry")
async def get_laundry():
    entries = await db.laundry_entries.find().to_list(10)
    if not entries:
        # Initialize default categories
        defaults = [
            LaundryEntry(category="clothes", last_done=datetime.now().strftime("%Y-%m-%d")),
            LaundryEntry(category="bedding", last_done=datetime.now().strftime("%Y-%m-%d")),
            LaundryEntry(category="gym_clothes", last_done=datetime.now().strftime("%Y-%m-%d"))
        ]
        for d in defaults:
            await db.laundry_entries.insert_one(d.dict())
        return defaults
    return [LaundryEntry(**e) for e in entries]

@api_router.post("/laundry")
async def update_laundry(laundry: LaundryUpdate):
    existing = await db.laundry_entries.find_one({"category": laundry.category})
    if existing:
        await db.laundry_entries.update_one(
            {"category": laundry.category},
            {"$set": {"last_done": laundry.last_done, "notes": laundry.notes}}
        )
    else:
        entry = LaundryEntry(**laundry.dict())
        await db.laundry_entries.insert_one(entry.dict())
    return {"message": "Laundry updated"}

# ========== CALENDAR ==========
@api_router.get("/calendar/{month}")
async def get_calendar_events(month: str):
    """Get events for a month (format: YYYY-MM)"""
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

# ========== DASHBOARD SUMMARY ==========
@api_router.get("/dashboard/{date}")
async def get_dashboard_summary(date: str):
    """Get all summary data for the dashboard"""
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
        }
    }

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
