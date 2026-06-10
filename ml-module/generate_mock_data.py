import random
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
import joblib
import os

def generate_mock_data(num_records=200):
    data = []
    # triage_options = ['Stable', 'Medium', 'Emergency']
    # diagnoses = ["Healthy", "Pneumonia", "Hypertension", "Diabetes", "Tachycardia"]
    # actions_pool = ["Hospitalize", "Oxygen", "EKG", "X-Ray", "Paracetamol"]
    
    for _ in range(num_records):
        age = random.randint(18, 90)
        systolic_bp = random.randint(90, 180)
        diastolic_bp = random.randint(60, 110)
        heart_rate = random.randint(50, 140)
        temperature = round(random.uniform(36.0, 40.0), 1)
        oxygen_saturation = random.randint(85, 100)
        pain_scale = random.randint(0, 10)
        
        # Determine rules for labels
        if oxygen_saturation < 92 and temperature > 38.0:
            actual_diagnosis = "Pneumonia"
            triage_level = "Emergency"
        elif systolic_bp > 140 or diastolic_bp > 90:
            actual_diagnosis = "Hypertension"
            triage_level = "Medium"
        elif heart_rate > 110 and pain_scale > 5:
            actual_diagnosis = "Tachycardia"
            triage_level = "Emergency"
        elif age > 50 and random.random() < 0.2:
            actual_diagnosis = "Diabetes"
            triage_level = "Medium"
        else:
            actual_diagnosis = "Healthy"
            triage_level = "Stable"
            
        actions = []
        if actual_diagnosis == "Pneumonia":
            actions.extend(["Oxygen", "X-Ray", "Hospitalize"])
        if actual_diagnosis == "Hypertension":
            actions.append("EKG")
        if temperature > 38.5 or pain_scale > 6:
            actions.append("Paracetamol")
        if oxygen_saturation < 88:
            actions.append("Hospitalize")
            
        actions_taken = ",".join(list(set(actions))) if actions else "None"
        
        data.append({
            "age": age,
            "systolic_bp": systolic_bp,
            "diastolic_bp": diastolic_bp,
            "heart_rate": heart_rate,
            "temperature": temperature,
            "oxygen_saturation": oxygen_saturation,
            "pain_scale": pain_scale,
            "triage_level": triage_level,
            "actual_diagnosis": actual_diagnosis,
            "actions_taken": actions_taken
        })
    
    return pd.DataFrame(data)

if __name__ == "__main__":
    base_dir = os.path.dirname(__file__)
    csv_path = os.path.join(base_dir, 'mock_patients.csv')
    
    print("Generating mock patient data...")
    df = generate_mock_data(300)
    df.to_csv(csv_path, index=False)
    print(f"Success! Saved mock dataset to: {csv_path}")
    
 