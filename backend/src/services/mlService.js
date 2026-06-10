// ============================================
// ML Microservice client — calls Python FastAPI
// ============================================

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

/**
 * Helper to build the unified ML payload from the database assessment object
 */
function buildMLPayload(assessment, patientAge = 30) {
  const [systolic, diastolic] = (assessment.blood_pressure || '120/80')
      .split('/')
      .map(Number);

  return {
    age: patientAge,
    systolic_bp: systolic || 120,
    diastolic_bp: diastolic || 80,
    heart_rate: assessment.pulse || 70,
    temperature: assessment.temperature || 36.6,
    oxygen_saturation: assessment.oxygen || 99,
    pain_scale: assessment.pain_scale || 0,
  };
}

/**
 * Generic fetch wrapper for ML endpoints
 */
async function fetchFromML(endpoint, payload) {
  try {
    const res = await fetch(`${ML_SERVICE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if(!res.ok) {
      console.warn(`ML service ${endpoint} returned ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn(`ML service ${endpoint} unavailable:`, err.message);
    return null;
  }
}

/**
 * Fetch all ML predictions in parallel.
 * Returns { triage, diagnosis, recommendations } on success, or null if the
 * ML service is unavailable.
 */
export async function getMLResults(assessment, patientAge) {
  const payload = buildMLPayload(assessment, patientAge);

  const [triageRes, diagnosisRes, recommendationsRes] = await Promise.all([
    fetchFromML('/predict-triage', payload),
    fetchFromML('/predict-diagnosis', payload),
    fetchFromML('/get-recommendations', payload)
  ]);

  return {
    triage: triageRes,
    diagnosis: diagnosisRes,
    recommendations: recommendationsRes
  };
}

// export async function predictTriage(assessment, patientAge = 40) {
//   try {
//     // Parse blood pressure string "120/80" → systolic + diastolic
//     const [systolic, diastolic] = (assessment.blood_pressure || '120/80')
//       .split('/')
//       .map(Number);

//     const payload = {
//       age: patientAge,
//       systolic_bp: systolic || 120,
//       diastolic_bp: diastolic || 80,
//       heart_rate: assessment.pulse || 70,
//       temperature: assessment.temperature || 36.6,
//       oxygen_saturation: assessment.oxygen || 99,
//       pain_scale: assessment.pain_scale || 3,
//     };

//     const res = await fetch(`${ML_SERVICE_URL}/predict-triage`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify(payload),
//     });

//     if (!res.ok) {
//       console.warn(`ML service returned ${res.status}`);
//       return null;
//     }

//     return await res.json();
//   } catch (err) {
//     // ML service might not be running — log and continue gracefully
//     console.warn('ML service unavailable:', err.message);
//     return null;
//   }
// }

// /**
//  * Send a document (as a Buffer) to the ML service for OCR parsing.
//  *
//  * Returns { raw_text, extracted_data } on success, or null on failure.
//  */
// export async function parseDocument(fileBuffer, filename) {
//   try {
//     // Build multipart form data manually using the Fetch API + FormData
//     const { FormData, Blob } = await import('node:buffer');
//     const formData = new globalThis.FormData();
//     const blob = new Blob([fileBuffer]);
//     formData.append('file', blob, filename);

//     const res = await fetch(`${ML_SERVICE_URL}/parse-document`, {
//       method: 'POST',
//       body: formData,
//     });

//     if (!res.ok) {
//       console.warn(`ML document parse returned ${res.status}`);
//       return null;
//     }

//     return await res.json();
//   } catch (err) {
//     console.warn('ML document parse unavailable:', err.message);
//     return null;
//   }
// }
