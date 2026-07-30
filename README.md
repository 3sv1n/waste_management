# Smart Waste Segregation API

This is a FastAPI project that serves a YOLOv8 object detection model for classifying waste items. It provides an endpoint to upload images, performs inference using a pre-trained model (`best.pt`), and logs the results to a SQLite database.

## Features

- **Object Detection**: Uses YOLOv8 to classify uploaded images of waste into categories like cardboard, glass, metal, paper, plastic, and trash.
- **Categorization**: Automatically groups detections into broader categories (`Recyclable` and `Non-Recyclable`).
- **Database Logging**: Saves the predicted class, confidence score, image path, timestamp, and category to a local SQLite database (`detections.db`).
- **Image Storage**: Uploaded images are saved locally in the `uploads/` directory.
- **Statistics Endpoint**: Retrieve overall stats like total processed items and counts per category.

## Prerequisites

- Python 3.10+
- The model file `best.pt` must be present in the root directory.

## Installation

Install the required Python packages using pip:

```bash
pip install fastapi "uvicorn[standard]" sqlalchemy python-multipart ultralytics opencv-python
```

## Running the Server

Start the FastAPI server using `uvicorn`:

```bash
uvicorn main:app --reload
```

The API will be available at `http://127.0.0.1:8000`. You can access the interactive API documentation (Swagger UI) at `http://127.0.0.1:8000/docs`.

## API Endpoints

### 1. Predict Image

- **URL**: `/predict`
- **Method**: `POST`
- **Description**: Upload an image for classification.
- **Content-Type**: `multipart/form-data`
- **Body**: form-data containing the `file` field with the image.

**Example Request using `curl`**:

```bash
curl -X 'POST' \
  'http://127.0.0.1:8000/predict' \
  -H 'accept: application/json' \
  -H 'Content-Type: multipart/form-data' \
  -F 'file=@cardboard.jpeg'
```

### 2. Get Recent Detections

- **URL**: `/detections`
- **Method**: `GET`
- **Description**: Returns a list of the most recent detections. Optional query parameter `limit` (default: 10).

### 3. Get Statistics

- **URL**: `/statistics`
- **Method**: `GET`
- **Description**: Returns total counts of processed items, recyclables, and non-recyclables.
