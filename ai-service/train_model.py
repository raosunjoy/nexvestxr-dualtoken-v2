import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
import joblib
import logging
from logging.handlers import RotatingFileHandler

# Configure logging
handler = RotatingFileHandler('model-training.log', maxBytes=1000000, backupCount=5)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[handler]
)
logger = logging.getLogger(__name__)

def generate_synthetic_data(n_samples=1000):
    """
    Generate synthetic data for training the Isolation Forest model.
    In production, use real labeled data.
    """
    np.random.seed(42)
    data = {
        'title_length': np.random.normal(500, 100, n_samples).astype(int),
        'title_property_count': np.random.poisson(5, n_samples),
        'title_encumbrance_count': np.random.poisson(2, n_samples),
        'title_date_count': np.random.poisson(3, n_samples),
        'title_currency_count': np.random.poisson(1, n_samples),
        'encumbrance_length': np.random.normal(300, 50, n_samples).astype(int),
        'encumbrance_property_count': np.random.poisson(3, n_samples),
        'encumbrance_encumbrance_count': np.random.poisson(4, n_samples),
        'encumbrance_date_count': np.random.poisson(2, n_samples),
        'encumbrance_currency_count': np.random.poisson(0.5, n_samples),
    }

    # Introduce anomalies
    anomaly_indices = np.random.choice(n_samples, int(n_samples * 0.1), replace=False)
    for idx in anomaly_indices:
        data['title_length'][idx] = np.random.choice([50, 2000])
        data['title_encumbrance_count'][idx] = 20  # Unusually high
        data['encumbrance_length'][idx] = 10  # Unusually low

    return pd.DataFrame(data)

def train_model():
    try:
        logger.info("Starting model training")
        
        # Generate synthetic data (replace with real data in production)
        df = generate_synthetic_data(1000)
        logger.info("Synthetic data generated", extra={"shape": df.shape})

        # Train Isolation Forest
        model = IsolationForest(contamination=0.1, random_state=42, n_estimators=100)
        model.fit(df)
        logger.info("Isolation Forest model trained")

        # Save the model
        joblib.dump(model, 'models/isolation_forest_model.pkl')
        logger.info("Model saved successfully")

        # Evaluate on training data
        predictions = model.predict(df)
        anomaly_scores = model.decision_function(df)
        anomaly_percentage = (predictions == -1).mean() * 100
        logger.info("Training evaluation", extra={
            "anomaly_percentage": anomaly_percentage,
            "mean_anomaly_score": anomaly_scores.mean()
        })

        return model

    except Exception as e:
        logger.error(f"Model training failed: {str(e)}")
        raise

if __name__ == "__main__":
    train_model()