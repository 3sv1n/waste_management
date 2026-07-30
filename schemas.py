from pydantic import BaseModel
from datetime import datetime

class DetectionBase(BaseModel):
    predicted_item: str
    confidence: float
    category: str

class DetectionResponse(DetectionBase):
    id: int
    timestamp: datetime
    image_path: str

    class Config:
        orm_mode = True
        from_attributes = True
