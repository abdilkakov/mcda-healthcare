import os
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.multioutput import MultiOutputClassifier
from sklearn.preprocessing import MultiLabelBinarizer, LabelEncoder
import joblib

def train_advanced_models():
    base_dir = os.path.dirname(__file__)
    csv_path = os.path.join(base_dir, 'mock_patients.csv')
    
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Missing training data at {csv_path}. Please run generate_mock_data.py first.")
        
    df = pd.read_csv(csv_path)
    
    # 1. Feature Selection
    feature_cols = ['age', 'systolic_bp', 'diastolic_bp', 'heart_rate', 'temperature', 'oxygen_saturation', 'pain_scale']
    X = df[feature_cols]
    
    # 2. Train Triage Model (Requires Label Encoding for SHAP alignment later)
    triage_encoder = LabelEncoder()
    y_triage = triage_encoder.fit_transform(df['triage_level'])
    
    triage_model = RandomForestClassifier(n_estimators=50, random_state=42)
    triage_model.fit(X, y_triage)
    
    joblib.dump(triage_model, os.path.join(base_dir, 'triage_model.pkl'))
    joblib.dump(triage_encoder, os.path.join(base_dir, 'triage_encoder.pkl'))
    print("Triage model and encoder saved.")

    # 3. Train Diagnosis Model
    diagnosis_model = RandomForestClassifier(n_estimators=50, random_state=42)
    diagnosis_model.fit(X, df['actual_diagnosis'])
    
    joblib.dump(diagnosis_model, os.path.join(base_dir, 'diagnosis_model.pkl'))
    print("Diagnosis model saved.")

    # 4. Train Multi-Label Recommendation Model
    # Parse comma-separated actions back into lists
    actions_series = df['actions_taken'].apply(lambda x: x.split(',') if pd.notna(x) else ['None'])
    
    mlb = MultiLabelBinarizer()
    y_actions = mlb.fit_transform(actions_series)
    
    rec_model = MultiOutputClassifier(RandomForestClassifier(n_estimators=50, random_state=42))
    rec_model.fit(X, y_actions)
    
    joblib.dump(rec_model, os.path.join(base_dir, 'recommendation_model.pkl'))
    joblib.dump(mlb, os.path.join(base_dir, 'actions_binarizer.pkl'))
    print("Multi-label Recommendation model and binarizer saved.")

if __name__ == "__main__":
    print("Starting model training pipeline...")
    train_advanced_models()
    print("All artifacts successfully trained and stored.")