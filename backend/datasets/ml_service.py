import pandas as pd
import numpy as np
import logging
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, log_loss, mean_squared_error, r2_score
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.svm import SVC, SVR
from sklearn.neural_network import MLPClassifier, MLPRegressor
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.impute import SimpleImputer

logger = logging.getLogger(__name__)

class MLService:
    """Service to handle model training logic using scikit-learn."""

    def __init__(self):
        # Supported classifiers
        self.classifiers = {
            'logistic_regression': LogisticRegression(max_iter=1000, random_state=42),
            'random_forest': RandomForestClassifier(n_estimators=100, random_state=42),
            'svm': SVC(probability=True, random_state=42),
            'neural_network': MLPClassifier(hidden_layer_sizes=(100,), max_iter=500, random_state=42)
        }
        
        # Supported regressors (for continuous targets)
        self.regressors = {
            'linear_regression': LinearRegression(),
            'random_forest': RandomForestRegressor(n_estimators=100, random_state=42),
            'svm': SVR(),
            'neural_network': MLPRegressor(hidden_layer_sizes=(100,), max_iter=500, random_state=42)
        }

    def train_model(self, df: pd.DataFrame, model_name: str, target_column: str, test_size: float = 0.2):
        """
        Train a machine learning model on the provided dataframe.
        """
        if target_column not in df.columns:
            raise ValueError(f"Target column '{target_column}' not found in dataset.")

        # 1. Handle Missing Values in Target
        df = df.dropna(subset=[target_column])
        
        if len(df) < 10:
             raise ValueError("Not enough data to train a model after dropping missing targets. Need at least 10 rows.")

        y = df[target_column]
        X = df.drop(columns=[target_column])

        # 2. Determine Task Type (Classification vs Regression)
        # Simple heuristic: if target is object/bool or low unique count, classification.
        is_classification = False
        if y.dtype == 'object' or y.dtype == 'bool' or pd.api.types.is_categorical_dtype(y):
            is_classification = True
        elif y.nunique() < 20 and pd.api.types.is_integer_dtype(y):
            is_classification = True # Assuming low-cardinality int is classification

        # 3. Preprocess Features (X)
        # Identify categorical and numerical columns
        cat_cols = X.select_dtypes(include=['object', 'category', 'bool']).columns.tolist()
        num_cols = X.select_dtypes(exclude=['object', 'category', 'bool']).columns.tolist()

        # Simple imputation for numeric features
        if len(num_cols) > 0:
            num_imputer = SimpleImputer(strategy='median')
            X[num_cols] = num_imputer.fit_transform(X[num_cols])
            
            # Scale numerical features (important for SVM, NN, Logistic)
            scaler = StandardScaler()
            X[num_cols] = scaler.fit_transform(X[num_cols])

        # Categorical features need encoding
        if len(cat_cols) > 0:
            # We'll use one-hot encoding for simplicity
            X = pd.get_dummies(X, columns=cat_cols, drop_first=True)

        # Ensure all column names are string (can get mixed types with dummies)
        X.columns = X.columns.astype(str)

        # 4. Preprocess Target (y)
        if is_classification:
            le = LabelEncoder()
            y = le.fit_transform(y)
            num_classes = len(le.classes_)
            if num_classes < 2:
                raise ValueError("Target column must have at least 2 distinct classes for classification.")

        # 5. Train-Test Split
        # Ensure stratify for classification if enough samples per class
        stratify_param = y if is_classification and sum(np.bincount(y) < 2) == 0 else None
        
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size / 100.0 if test_size >= 1 else test_size, 
            random_state=42, stratify=stratify_param
        )

        # 6. Select and Train Model
        try:
            if is_classification:
                if model_name not in self.classifiers:
                    # Fallback to random forest if unknown
                    model = self.classifiers['random_forest']
                else:
                    model = self.classifiers[model_name]
            else:
                 # Map classification names to regression names if needed
                 if model_name == 'logistic_regression': 
                     model_name = 'linear_regression'
                 
                 if model_name not in self.regressors:
                    model = self.regressors['random_forest']
                 else:
                    model = self.regressors[model_name]
            
            logger.info(f"Training {model_name} (Classification: {is_classification}) on shape X_train: {X_train.shape}, y_train: {y_train.shape}")
            logger.info(f"Target distribution train: {np.bincount(y_train) if is_classification else 'N/A'}, test: {np.bincount(y_test) if is_classification else 'N/A'}")
            model.fit(X_train, y_train)
            
            # 7. Evaluate
            predictions = model.predict(X_test)
            metrics = {}

            logger.info(f"Predictions preview: {predictions[:10]}")
            logger.info(f"True labels preview: {y_test[:10] if isinstance(y_test, np.ndarray) else y_test.values[:10]}")

            if is_classification:
                metrics['accuracy'] = float(accuracy_score(y_test, list(predictions)))
                # Handling multiclass precision/recall
                avg_type = 'binary' if num_classes == 2 else 'weighted'
                metrics['precision'] = float(precision_score(y_test, predictions, average=avg_type, zero_division=0))
                metrics['recall'] = float(recall_score(y_test, predictions, average=avg_type, zero_division=0))
                
                # Try log loss if probability is available
                try:
                    probas = model.predict_proba(X_test)
                    metrics['loss'] = float(log_loss(y_test, probas))
                except (AttributeError, ValueError):
                    metrics['loss'] = 1.0 - metrics['accuracy'] # Fake loss fallback
                
                logger.info(f"Classification metrics: {metrics}")

            else:
                metrics['accuracy'] = float(r2_score(y_test, predictions)) # Using R2 as accuracy proxy for regression UI
                metrics['loss'] = float(mean_squared_error(y_test, predictions))
                # Precision/Recall don't make sense for regression, set to None or 0
                metrics['precision'] = 0.0
                metrics['recall'] = 0.0
                
                logger.info(f"Regression metrics: {metrics}")

            return metrics

        except Exception as e:
            logger.error(f"Model training failed: {e}")
            raise RuntimeError(f"Failed to train model: {str(e)}")

ml_service = MLService()
