import os
import shutil
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from ultralytics import YOLO

from database import engine, Base, get_db
import models, schemas

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Smart Waste Segregation API")

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Load YOLOv8 model
MODEL_PATH = "best.pt"
if not os.path.exists(MODEL_PATH):
    raise RuntimeError(f"Model file '{MODEL_PATH}' not found!")
model = YOLO(MODEL_PATH)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def get_category(predicted_item: str) -> str:
    """Map YOLO classes to broad categories."""
    if predicted_item.lower() == "trash":
        return "Non-Recyclable"
    return "Recyclable"

@app.post("/predict", response_model=schemas.DetectionResponse)
async def predict_image(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")

    # Generate a unique filename using timestamp
    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_extension = os.path.splitext(file.filename)[1]
    safe_filename = f"{timestamp_str}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)

    # Save the uploaded file to disk
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Run inference on the saved image
    results = model(file_path)
    
    # Extract prediction with highest confidence
    # YOLO results is a list of Result objects (one per image)
    if not results or len(results[0].boxes) == 0:
        # If no objects are detected, you might want to handle it differently.
        # For now, default to trash if nothing is recognized, or raise an error.
        raise HTTPException(status_code=404, detail="No objects detected in the image.")
    
    # Get the best detection
    # results[0].boxes contains all bounding boxes detected
    boxes = results[0].boxes
    best_box = max(boxes, key=lambda b: float(b.conf[0]))
    
    class_id = int(best_box.cls[0])
    confidence = float(best_box.conf[0])
    predicted_item = model.names[class_id]
    
    category = get_category(predicted_item)

    # Save to Database
    db_detection = models.Detection(
        predicted_item=predicted_item,
        confidence=confidence,
        image_path=file_path,
        category=category
    )
    db.add(db_detection)
    db.commit()
    db.refresh(db_detection)

    return db_detection

@app.get("/detections", response_model=list[schemas.DetectionResponse])
def get_recent_detections(limit: int = 10, db: Session = Depends(get_db)):
    detections = db.query(models.Detection).order_by(models.Detection.timestamp.desc()).limit(limit).all()
    return detections

@app.get("/statistics")
def get_statistics(db: Session = Depends(get_db)):
    total = db.query(models.Detection).count()
    
    from sqlalchemy import func
    items_counts = db.query(
        models.Detection.predicted_item, 
        func.count(models.Detection.id)
    ).group_by(models.Detection.predicted_item).all()
    
    counts_dict = {item: count for item, count in items_counts}
    
    return {
        "total_processed": total,
        "items": counts_dict,
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

