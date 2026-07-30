from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime
import pytz

from database import Base

class Detection(Base):
    __tablename__ = "detections"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    predicted_item = Column(String, index=True)
    confidence = Column(Float)
    image_path = Column(String)
    category = Column(String, index=True)
