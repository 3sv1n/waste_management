from pydantic import BaseModel, ConfigDict
from datetime import datetime

class DetectionBase(BaseModel):
    predicted_item: str
    confidence: float
    category: str

class DetectionResponse(DetectionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    timestamp: datetime
    image_path: str

