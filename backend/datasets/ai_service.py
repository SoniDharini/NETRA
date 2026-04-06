import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

def get_groq_client():
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY is not set in environment variables.")
    return Groq(api_key=api_key)

def process_nlq(df, query):
    """
    Process a Natural Language Query against a DataFrame to return a visualization configuration.
    """
    columns_info = {col: str(dtype) for col, dtype in df.dtypes.items()}
    sample_data = df.head(3).to_dict(orient='records')
    
    prompt = f"""
    You are a data visualization assistant.
    The user has a dataset with the following columns: {columns_info}
    A sample of the data: {sample_data}
    
    The user asked: "{query}"
    
    Create a JSON response for a chart configuration. Determine the best chart_type ('bar', 'line', 'scatter', 'pie', 'histogram', 'boxplot').
    Then define x and y data columns accordingly. For pie chart, x is the category and y is value.
    The JSON structure MUST look exactly like this:
    {{
        "chartType": "bar",
        "chartConfig": {{
            "columns": [{{"name": "columnA", "type": "dimension"}}],
            "rows": [{{"name": "columnB", "type": "measure", "aggregation": "sum"}}]
        }},
        "interpretation": "I grouped columnA to check total columnB over time."
    }}
    
    IMPORTANT RULES:
    - Only use column names that exist in the dataset: {list(columns_info.keys())}
    - The "interpretation" must be a clear, human-readable sentence explaining what the chart shows.
    - For rows, if it is a numeric column, provide an aggregation (sum/mean/count).
    - Return ONLY valid JSON, no extra text.
    """
    try:
        client = get_groq_client()
        response = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            
            model="llama-3.3-70b-versatile",
            temperature=0,
            response_format={"type": "json_object"}
        )
        content = response.choices[0].message.content
        result = json.loads(content)
        # Validate that columns in config actually exist in the dataset
        valid_cols = set(columns_info.keys())
        chart_cfg = result.get("chartConfig", {})
        chart_cfg["columns"] = [c for c in chart_cfg.get("columns", []) if c.get("name") in valid_cols]
        chart_cfg["rows"] = [r for r in chart_cfg.get("rows", []) if r.get("name") in valid_cols]
        result["chartConfig"] = chart_cfg
        return result
    except Exception as e:
        # Fallback interpretation if LLM fails
        return {
            "chartType": "bar",
            "chartConfig": {
                "columns": [],
                "rows": []
            },
            "interpretation": f"Error parsing query via Groq: {str(e)}"
        }

def process_model_nlq(df, query, model_name=None, metrics=None):
    """
    Process a Natural Language Query in a model training context.
    Returns a plain text analytical response about the model/data, not a chart config.
    """
    columns_info = {col: str(dtype) for col, dtype in df.dtypes.items()}
    numeric_stats = {}
    for col in df.select_dtypes(include=['number']).columns[:10]:
        numeric_stats[col] = {
            "mean": round(float(df[col].mean()), 4),
            "std": round(float(df[col].std()), 4),
            "min": round(float(df[col].min()), 4),
            "max": round(float(df[col].max()), 4),
        }

    metrics_str = ""
    if metrics:
        metrics_str = f"\nModel performance metrics: {json.dumps(metrics)}"
    model_str = f"\nModel used: {model_name}" if model_name else ""

    prompt = f"""
    You are an ML data scientist assistant helping interpret model results.
    
    Dataset columns: {columns_info}
    Numeric column statistics: {numeric_stats}
    Dataset shape: {len(df)} rows x {len(df.columns)} columns{model_str}{metrics_str}
    
    The user asked: "{query}"
    
    Provide a clear, concise analytical response in JSON format:
    {{
        "answer": "A 2-4 sentence plain English answer to the user's question about the model or data. Be specific and actionable.",
        "insights": ["key insight 1", "key insight 2", "key insight 3"],
        "recommendation": "One specific action the user can take to improve results."
    }}
    
    Return ONLY valid JSON.
    """
    try:
        client = get_groq_client()
        response = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0,
            response_format={"type": "json_object"}
        )
        content = response.choices[0].message.content
        return json.loads(content)
    except Exception as e:
        return {
            "answer": f"Could not process query via AI: {str(e)}",
            "insights": [],
            "recommendation": "Try rephrasing your question."
        }

def get_model_recommendations(df):
    """
    Generate model recommendations.
    """
    columns_info = {col: str(dtype) for col, dtype in df.dtypes.items()}
    prompt = f"""
    You are an ML expert. The dataset columns: {columns_info}.
    We need 3 ML models suitable for this. Output MUST be valid JSON with key "recommendations" containing a list of objects exactly like this:
    {{
      "recommendations": [
        {{
          "name": "random_forest",
          "type": "classification",
          "description": "Good for non-linear data",
          "recommended": true,
          "defaultParams": {{"n_estimators": 100}}
        }}
      ]
    }}
    The names must be typical like 'random_forest', 'logistic_regression', 'linear_regression', 'svm', 'gradient_boosting'.
    If the target column is typically regression, use regression types.
    """
    try:
        client = get_groq_client()
        response = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0,
            response_format={"type": "json_object"}
        )
        content = response.choices[0].message.content
        result = json.loads(content)
        return result.get("recommendations", [])
    except Exception as e:
        return [
            {
               "name": "random_forest",
               "type": "classification",
               "description": f"Fallback model due to AI error: {str(e)}",
               "recommended": True,
               "defaultParams": {}
            }
        ]
