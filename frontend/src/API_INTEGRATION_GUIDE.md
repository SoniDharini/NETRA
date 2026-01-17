# API Integration Guide for Flask/Django Backend

This guide explains how to integrate your Flask or Django backend with the ML Analysis Platform frontend.

## Quick Start

### Configuration

1. **Update API Base URL** in `/config/api.ts`:
   ```typescript
   // For Flask (default port 5000)
   BASE_URL: 'http://localhost:5000/api'
   
   // For Django (default port 8000)
   BASE_URL: 'http://localhost:8000/api'
   ```

2. **Toggle Mock API** in `/services/api.service.ts`:
   ```typescript
   // Set to false when your backend is ready
   const USE_MOCK_API = false;
   ```

## Backend API Endpoints

### 1. Data Upload Endpoints

#### POST `/api/data/upload`
Upload a CSV or Excel file for analysis.

**Request:**
- Content-Type: `multipart/form-data`
- Body: `file` (CSV or Excel file)

**Response:**
```json
{
  "success": true,
  "data": {
    "fileId": "unique_file_identifier",
    "preview": {
      "columns": ["col1", "col2", "col3"],
      "rows": [
        {"col1": "value1", "col2": "value2"},
        ...
      ],
      "rowCount": 1000,
      "columnTypes": {
        "col1": "integer",
        "col2": "float",
        "col3": "string"
      }
    }
  }
}
```

#### POST `/api/data/validate`
Validate uploaded data for issues.

**Request:**
```json
{
  "fileId": "unique_file_identifier"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "issues": []
  }
}
```

---

### 2. Preprocessing Endpoints

#### POST `/api/preprocessing/suggestions`
Get AI-based preprocessing suggestions.

**Request:**
```json
{
  "fileId": "unique_file_identifier"
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "type": "remove_duplicates",
      "description": "Remove duplicate rows",
      "recommended": true
    },
    {
      "type": "fill_missing",
      "column": "age",
      "description": "Fill missing values in age column",
      "recommended": true
    }
  ]
}
```

#### POST `/api/preprocessing/apply`
Apply preprocessing steps to the dataset.

**Request:**
```json
{
  "fileId": "unique_file_identifier",
  "steps": [
    {
      "type": "remove_duplicates",
      "column": null,
      "description": "Remove duplicates",
      "recommended": true
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "processedFileId": "processed_file_id",
    "summary": "Successfully applied 3 preprocessing steps"
  }
}
```

#### POST `/api/preprocessing/feature-engineering`
Get feature engineering suggestions.

**Request:**
```json
{
  "fileId": "unique_file_identifier"
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "age_group",
      "description": "Create age groups from age column",
      "type": "binning",
      "columns": ["age"]
    }
  ]
}
```

---

### 3. Model Training Endpoints

#### POST `/api/models/recommendations`
Get model recommendations based on the dataset.

**Request:**
```json
{
  "fileId": "unique_file_identifier"
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "Random Forest",
      "type": "classification",
      "description": "Ensemble method for classification",
      "recommended": true,
      "defaultParams": {
        "n_estimators": 100,
        "max_depth": 10
      }
    }
  ]
}
```

#### POST `/api/models/train`
Train a machine learning model.

**Request:**
```json
{
  "fileId": "processed_file_id",
  "modelName": "Random Forest",
  "targetColumn": "target",
  "params": {
    "n_estimators": 100,
    "max_depth": 10
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "trainingId": "training_job_id"
  }
}
```

#### GET `/api/models/training-status/:trainingId`
Get training job status.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "completed",
    "progress": 100
  }
}
```

Possible status values: `pending`, `training`, `completed`, `failed`

#### GET `/api/models/metrics/:trainingId`
Get model performance metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "accuracy": 0.92,
    "precision": 0.89,
    "recall": 0.91,
    "f1Score": 0.90,
    "loss": 0.15,
    "confusionMatrix": [[150, 10], [8, 132]],
    "featureImportance": [
      {
        "feature": "income",
        "importance": 0.35
      }
    ]
  }
}
```

---

### 4. Visualization Endpoints

#### POST `/api/visualizations/suggestions`
Get visualization suggestions for the dataset.

**Request:**
```json
{
  "fileId": "unique_file_identifier"
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "type": "scatter",
      "title": "Age vs Income",
      "description": "Scatter plot showing relationship",
      "columns": ["age", "income"],
      "recommended": true
    }
  ]
}
```

#### POST `/api/visualizations/generate`
Generate a specific visualization.

**Request:**
```json
{
  "fileId": "unique_file_identifier",
  "vizType": "scatter",
  "config": {
    "xAxis": "age",
    "yAxis": "income"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "chartData": [
      {"age": 25, "income": 45000},
      {"age": 34, "income": 62000}
    ]
  }
}
```

#### POST `/api/visualizations/nlq`
Process natural language query for visualization.

**Request:**
```json
{
  "fileId": "unique_file_identifier",
  "query": "Show me the correlation between age and income"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "visualization": {
      "type": "scatter",
      "data": [...],
      "config": {...}
    },
    "interpretation": "The correlation between age and income is 0.75..."
  }
}
```

---

### 5. Report Generation Endpoints

#### POST `/api/reports/generate`
Generate analysis report.

**Request:**
```json
{
  "projectData": {
    "fileName": "dataset.csv",
    "preprocessingSteps": ["remove_duplicates"],
    "selectedModel": "Random Forest",
    "modelMetrics": {...}
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reportId": "report_unique_id"
  }
}
```

#### GET `/api/reports/download/:reportId?format=pdf`
Download report in specified format.

**Query Parameters:**
- `format`: `pdf` or `docx`

**Response:** Binary file stream

---

### 6. Project Management Endpoints (Optional)

#### POST `/api/projects/save`
Save project state.

**Request:**
```json
{
  "projectData": {...}
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "projectId": "project_unique_id"
  }
}
```

#### GET `/api/projects/:id`
Get saved project.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "project_id",
    "name": "My Project",
    "createdAt": "2025-10-09T10:00:00Z",
    ...
  }
}
```

#### GET `/api/projects/list`
List all projects.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "project_1",
      "name": "Customer Analysis",
      "createdAt": "2025-10-01T10:00:00Z"
    }
  ]
}
```

---

## CORS Configuration

### Flask Example:
```python
from flask_cors import CORS

app = Flask(__name__)
CORS(app, origins=['http://localhost:3000'])  # Update for production
```

### Django Example:
```python
# settings.py
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",  # Update for production
]
```

---

## Error Handling

All endpoints should return errors in this format:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

---

## Example Flask Implementation

```python
from flask import Flask, request, jsonify
import pandas as pd

app = Flask(__name__)

@app.route('/api/data/upload', methods=['POST'])
def upload_data():
    try:
        file = request.files['file']
        
        # Read file
        if file.filename.endswith('.csv'):
            df = pd.read_csv(file)
        else:
            df = pd.read_excel(file)
        
        # Generate file ID and store
        file_id = generate_unique_id()
        store_dataframe(file_id, df)
        
        # Create preview
        preview = {
            'columns': df.columns.tolist(),
            'rows': df.head(5).to_dict('records'),
            'rowCount': len(df),
            'columnTypes': df.dtypes.astype(str).to_dict()
        }
        
        return jsonify({
            'success': True,
            'data': {
                'fileId': file_id,
                'preview': preview
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400
```

---

## Example Django Implementation

```python
from rest_framework.decorators import api_view
from rest_framework.response import Response
import pandas as pd

@api_view(['POST'])
def upload_data(request):
    try:
        file = request.FILES['file']
        
        # Read file
        if file.name.endswith('.csv'):
            df = pd.read_csv(file)
        else:
            df = pd.read_excel(file)
        
        # Generate file ID and store
        file_id = generate_unique_id()
        store_dataframe(file_id, df)
        
        # Create preview
        preview = {
            'columns': df.columns.tolist(),
            'rows': df.head(5).to_dict('records'),
            'rowCount': len(df),
            'columnTypes': df.dtypes.astype(str).to_dict()
        }
        
        return Response({
            'success': True,
            'data': {
                'fileId': file_id,
                'preview': preview
            }
        })
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=400)
```

---

## Testing

1. Start your Flask/Django backend
2. Update `USE_MOCK_API = false` in `/services/api.service.ts`
3. Update the `BASE_URL` in `/config/api.ts` to point to your backend
4. Test each feature in the frontend

The application will now make real API calls to your backend!

---

## Notes

- All file uploads should be validated for type and size
- Store uploaded files and processed data in a temporary cache or database
- Consider implementing authentication if deploying to production
- Add rate limiting to prevent abuse
- Implement proper logging for debugging
