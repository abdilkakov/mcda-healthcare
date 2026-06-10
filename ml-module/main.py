import io
import os
import numpy as np
import pandas as pd
import joblib
import easyocr
import shap
from PIL import Image
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="MCDA Healthcare ML Service")

# Allow requests from Node.js backend or frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class AssessmentInput(BaseModel):
    age: int
    systolic_bp: int
    diastolic_bp: int
    heart_rate: int
    temperature: float
    oxygen_saturation: int
    pain_scale: int

# 1. Load the pre-trained ML models on startup
base_dir = os.path.dirname(__file__)
try:
    triage_model = joblib.load(os.path.join(base_dir, 'triage_model.pkl'))
    triage_encoder = joblib.load(os.path.join(base_dir, 'triage_encoder.pkl'))
    diagnosis_model = joblib.load(os.path.join(base_dir, 'diagnosis_model.pkl'))
    recommendation_model = joblib.load(os.path.join(base_dir, 'recommendation_model.pkl'))
    actions_binarizer = joblib.load(os.path.join(base_dir, 'actions_binarizer.pkl'))
    
    # Initialize SHAP explainer on base model tree structures
    explainer = shap.TreeExplainer(triage_model)
    print("All ML models and explanation tools loaded successfully.")
except Exception as e:
    print(f"CRITICAL WARNING: Dependency models failed to compile or load: {e}")
    triage_model = diagnosis_model = recommendation_model = explainer = triage_encoder = actions_binarizer = None

# 2. Initialize EasyOCR reader on startup (supports Russian + English)
# The models are downloaded once and cached locally.
print("Loading EasyOCR models (first run will download ~100MB)...")
ocr_reader = easyocr.Reader(['ru', 'en'], gpu=False)
print("EasyOCR ready.")

# 3. Define the expected input schema for Triage
@app.get("/")
def read_root():
    return {"status": "online", "message": "MCDA ML Service is active"}

# 4. Triage Prediction Endpoint
@app.post("/predict-triage")
def predict_triage(assessment: AssessmentInput):
    if not triage_model or not explainer or not triage_encoder:
        raise HTTPException(status_code=500, detail="Triage classification context missing.")
        
    # Convert input to DataFrame (expected format for sklearn)
    input_data = pd.DataFrame([assessment.model_dump()])
    
    # Encoded numeric label prediction
    pred_encoded = int(triage_model.predict(input_data)[0])
    string_label = triage_encoder.inverse_transform([pred_encoded])[0]
    
    # SHAP explanation
    shap_matrix = explainer.shap_values(input_data)
    
    if isinstance(shap_matrix, list):
        class_shap_values = shap_matrix[pred_encoded][0]
    elif isinstance(shap_matrix, np.ndarray) and len(shap_matrix.shape) == 3:
        # Array format: (samples, features, classes)
        class_shap_values = shap_matrix[0, :, pred_encoded]
    else:
        class_shap_values = shap_matrix[0]
    
    # Identify top 2 contributing factors
    feature_importance = dict(zip(input_data.columns, class_shap_values))
    sorted_factors = sorted(feature_importance.items(), key=lambda x: abs(x[1]), reverse=True)
    
    top_factors = [f"{name} ({'high' if val > 0 else 'low'})" for name, val in sorted_factors[:2]]
    ai_summary = f"The model assigned level {string_label} due to {top_factors[0]} and {top_factors[1]}."
    
    return {
        "status": "success",
        "triage_level": string_label,
        "ai_summary": ai_summary,
        "factors": {k: float(v) for k, v in feature_importance.items()}
    }
    
# 5. Diagnosis Prediction
@app.post("/predict-diagnosis")
def predict_diagnosis(assessment: AssessmentInput):
    if not diagnosis_model:
        raise HTTPException(status_code=500, detail="Diagnosis inference model missing.")
        
    input_data = pd.DataFrame([assessment.model_dump()])
    
    probs = diagnosis_model.predict_proba(input_data)[0]
    classes = diagnosis_model.classes_
    
    top_indices = np.argsort(probs)[-3:][::-1]
    results = [
        {"diagnosis": str(classes[i]), "confidence": round(float(probs[i]) * 100, 1)} 
        for i in top_indices if probs[i] > 0
    ]
    
    return {"top_diagnoses": results}

# 6. Medical Recommendations
@app.post("/get-recommendations")
def get_recommendation(assessment: AssessmentInput):
    if not recommendation_model or not actions_binarizer:
        raise HTTPException(status_code=500, detail="Recommendation engine dependencies missing.")
        
    # Vitals act as key parameters to match against multi-output layers
    input_data = pd.DataFrame([assessment.model_dump()])
    
    actions_binary = recommendation_model.predict(input_data)
    results = actions_binarizer.inverse_transform(actions_binary)[0]
    
    return {"recommended_actions": list(results)}
    


# 7. Document OCR & Parsing Endpoint (EasyOCR)
@app.post("/parse-document")
async def parse_document(file: UploadFile = File(...)):
    # Read the file contents
    contents = await file.read()
    
    try:
        # Open the image using Pillow and convert to numpy array for EasyOCR
        image = Image.open(io.BytesIO(contents))
        image_np = np.array(image)
        
        # Run EasyOCR — returns list of (bbox, text, confidence) tuples
        results = ocr_reader.readtext(image_np)
        
        # Combine all detected text fragments into a single string
        extracted_text = "\n".join([text for (_, text, _) in results])
        
        # Build a detailed result with confidence scores per text block
        text_blocks = [
            {"text": text, "confidence": round(float(conf), 3)}
            for (_, text, conf) in results
        ]
        
        # Placeholder NLP extraction (keyword-based for now)
        # In the future, replace with SpaCy NER or a trained model
        text_lower = extracted_text.lower()
        mock_diagnosis = "Unknown"
        if "диабет" in text_lower or "diabetes" in text_lower:
            mock_diagnosis = "Diabetes"
        elif "гипертония" in text_lower or "hypertension" in text_lower:
            mock_diagnosis = "Hypertension"
        elif "пневмония" in text_lower or "pneumonia" in text_lower:
            mock_diagnosis = "Pneumonia"
            
        return {
            "status": "success",
            "filename": file.filename,
            "raw_text": extracted_text,
            "text_blocks": text_blocks,
            "extracted_data": {
                "diagnosis_hint": mock_diagnosis,
                "notes": "Full NLP extraction pending real training data."
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    # Run the server on port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)
