from flask import Flask, request, jsonify
import os
import pickle
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
import logging

app = Flask(__name__)

# Configure logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)

# Load the trained model
MODEL_PATH = os.getenv('MODEL_PATH', '/app/models')
model_file = os.path.join(MODEL_PATH, 'isolation_forest_model.pkl')
try:
    with open(model_file, 'rb') as f:
        model = pickle.load(f)
    logger.info("Model loaded successfully")
except Exception as e:
    logger.error(f"Failed to load model: {str(e)}")
    model = None

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "OK"})

@app.route('/analyze-document', methods=['POST'])
def analyze_document():
    try:
        if model is None:
            logger.error("Model not loaded")
            return jsonify({
                "success": False,
                "error": "Model not loaded",
                "recommendation": "Manual review required",
                "analyzedAt": pd.Timestamp.now().isoformat()
            }), 500

        data = request.get_json()
        if not data or 'document' not in data:
            logger.error("Document data is required")
            return jsonify({
                "success": False,
                "error": "Document data is required",
                "recommendation": "Manual review required",
                "analyzedAt": pd.Timestamp.now().isoformat()
            }), 400

        document = str(data['document'])
        
        # Extract features from the document (simplified for testing)
        features = [
            len(document),  # Document length
            len(document.split()),  # Word count
            sum(1 for c in document.lower() if c in 'aeiou')  # Vowel count
        ]
        features_array = np.array([features])

        # Predict anomaly score using the Isolation Forest model
        anomaly_scores = model.decision_function(features_array)
        predictions = model.predict(features_array)
        
        anomaly_score = float(anomaly_scores[0])
        is_anomaly = bool(predictions[0] == -1)  # -1 indicates anomaly
        
        # Convert anomaly score to confidence
        confidence = max(0.0, min(100.0, (1 + anomaly_score) * 50))

        # Determine risks
        risks = []
        if len(document) == 0:
            risks.append('Missing critical title deed')
        if len(document.split()) < 10:
            risks.append('Unusual number of words in title deed')

        result = {
            "success": True,
            "isAnomaly": is_anomaly,
            "confidence": f"{confidence:.1f}%",
            "risks": risks if len(risks) > 0 else ["No significant risks detected"],
            "recommendation": "Manual review required" if is_anomaly else "No action needed",
            "analyzedAt": pd.Timestamp.now().isoformat()
        }
        
        logger.info("Document analysis completed")
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Document analysis failed: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e),
            "recommendation": "Manual review required",
            "analyzedAt": pd.Timestamp.now().isoformat()
        }), 500

if __name__ == '__main__':  
    app.run(host='0.0.0.0', port=5000, debug=False)

