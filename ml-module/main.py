import io
import os
import re
import numpy as np
import pandas as pd
import joblib
import joblib
from markitdown import MarkItDown
import shap
import tempfile
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

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

class MatchRequest(BaseModel):
    patient_context: str
    documents: list[dict]

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

# 2. Initialize MarkItDown reader on startup
print("Initializing MarkItDown...")
md_parser = MarkItDown()
print("MarkItDown ready.")

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
    


# 7. Document Parsing Endpoint (MarkItDown)
@app.post("/parse-document")
async def parse_document(file: UploadFile = File(...)):
    try:
        print(f"Parsing document: {file.filename}, content_type: {file.content_type}")
        # MarkItDown relies on file extensions to determine the parser type
        suffix = os.path.splitext(file.filename)[1].lower()
        if not suffix:
            # Fallback based on content type or just assume pdf
            if file.content_type == 'application/pdf':
                suffix = '.pdf'
            elif file.content_type in ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']:
                suffix = '.docx'
            else:
                suffix = '.txt'
                
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            contents = await file.read()
            tmp.write(contents)
            tmp_path = tmp.name

        try:
            # Convert file to Markdown
            result = md_parser.convert(tmp_path)
            extracted_text = result.text_content
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        
        # NLP Extraction for Treatment Recommendations
        text_lower = extracted_text.lower()
        
        # 1. Basic Keyword/Diagnosis mapping
        mock_diagnosis = "Unknown"
        if "диабет" in text_lower or "diabetes" in text_lower:
            mock_diagnosis = "Diabetes"
        elif "гипертония" in text_lower or "hypertension" in text_lower:
            mock_diagnosis = "Hypertension"
        elif "пневмония" in text_lower or "pneumonia" in text_lower:
            mock_diagnosis = "Pneumonia"
            
        # 2. Extract Sentences with clinical recommendation keywords
        # Split text into sentences using simple regex on punctuation
        sentences = re.split(r'(?<=[.!?])\s+', extracted_text)
        
        target_keywords = [
            "рекомендуется", "рекомендовано", "обязательно", 
            "назначить", "treatment", "must", "должен", "терапия", "показано"
        ]
        
        recommended_sentences = []
        for sentence in sentences:
            s_lower = sentence.lower()
            if any(k in s_lower for k in target_keywords):
                # Clean up newlines and extra spaces
                clean_sentence = " ".join(sentence.split())
                if len(clean_sentence) > 10: # Ignore very short artifacts
                    recommended_sentences.append(clean_sentence)
            
        return {
            "status": "success",
            "filename": file.filename,
            "raw_text": extracted_text,
            "text_blocks": [{"text": extracted_text, "confidence": 1.0}],
            "extracted_data": {
                "diagnosis_hint": mock_diagnosis,
                "recommended_sentences": recommended_sentences,
                "notes": "NLP Extracted treatment sentences successfully."
            }
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        # Return 200 with error details instead of 500 so UI doesn't completely fail
        return {
            "status": "error",
            "filename": file.filename,
            "raw_text": f"Error extracting text: {str(e)}",
            "extracted_data": {"notes": "Extraction failed"}
        }

@app.post("/match-recommendations")
async def match_recommendations(req: MatchRequest):
    try:
        if not req.patient_context or not req.documents:
            return {"recommendations": []}

        candidate_sentences = []
        sources = []
        for doc in req.documents:
            for s in doc.get("sentences", []):
                candidate_sentences.append(s)
                sources.append(doc.get("filename", "Глобальная база"))

        if not candidate_sentences:
            return {"recommendations": []}

        # Vectorize using TF-IDF
        vectorizer = TfidfVectorizer()
        all_texts = [req.patient_context] + candidate_sentences
        tfidf_matrix = vectorizer.fit_transform(all_texts)
        
        patient_vec = tfidf_matrix[0]
        sentence_vecs = tfidf_matrix[1:]

        # Compute cosine similarities
        similarities = cosine_similarity(patient_vec, sentence_vecs)[0]

        # Filter and rank (threshold 0.02 to allow short sentence overlaps)
        threshold = 0.02
        results = []
        for i, score in enumerate(similarities):
            if score >= threshold:
                results.append({
                    "text": candidate_sentences[i],
                    "source": f"Глобальная база: {sources[i]}",
                    "score": round(float(score) * 100, 1)
                })

        # Sort by highest score first
        results.sort(key=lambda x: x["score"], reverse=True)

        return {"recommendations": results[:20]}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # Run the server on port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)
