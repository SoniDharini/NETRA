# Backend Integration Checklist - Visualization Workspace

## Overview

This checklist helps backend developers integrate their ML/data processing backend with the new Tableau-like visualization workspace.

## Quick Start

### 1. Enable Real API Mode

In `/services/api.service.ts`, line 12:
```typescript
const USE_MOCK_API = false; // Change from true to false
```

## API Endpoints to Implement

### Priority 1: Core Visualization (Required)

#### ✅ GET /api/data/preview
**Purpose**: Get data preview for field detection and chart rendering

**Request**:
```json
{
  "fileId": "string",
  "limit": 100
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "columns": ["Category", "Sales", "Profit", "Date"],
    "rows": [
      { "Category": "Electronics", "Sales": 50000, "Profit": 12000, "Date": "2024-01-01" },
      { "Category": "Furniture", "Sales": 30000, "Profit": 8000, "Date": "2024-01-02" }
    ],
    "rowCount": 1000,
    "columnTypes": {
      "Category": "string",
      "Sales": "number",
      "Profit": "number",
      "Date": "date"
    }
  }
}
```

**Implementation Notes**:
- Return up to 1000 rows for visualization
- Detect and label column types accurately
- Date columns should be ISO 8601 format or parseable

---

#### ✅ POST /api/visualization/generate
**Purpose**: Generate chart data based on user configuration

**Request**:
```json
{
  "fileId": "string",
  "vizType": "bar" | "line" | "scatter" | "pie" | "area" | "histogram",
  "config": {
    "columns": [
      { "name": "Category", "type": "dimension", "dataType": "string" }
    ],
    "rows": [
      { "name": "Sales", "type": "measure", "dataType": "number" }
    ],
    "color": { "name": "Region", "type": "dimension", "dataType": "string" },
    "size": { "name": "Profit", "type": "measure", "dataType": "number" },
    "aggregation": "sum" | "average" | "count" | "min" | "max",
    "filterType": "top" | "bottom",
    "filterCount": 10
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "chartData": [
      { "Category": "Electronics", "Sales": 50000, "Region": "East", "Profit": 12000 },
      { "Category": "Furniture", "Sales": 30000, "Region": "West", "Profit": 8000 }
    ],
    "metadata": {
      "totalRecords": 1000,
      "filteredRecords": 2,
      "aggregationType": "sum"
    }
  }
}
```

**Implementation Notes**:
- Apply aggregation based on config.aggregation
- Apply filters (top/bottom N) if specified
- Return data ready for chart rendering
- Handle multiple measures in rows for multi-series charts

---

### Priority 2: Natural Language Queries (Recommended)

#### ✅ POST /api/visualization/nlq
**Purpose**: Process natural language queries and return visualization config

**Request**:
```json
{
  "fileId": "string",
  "query": "Show sales by category for Q1"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "visualization": {
      "chartType": "bar",
      "config": {
        "columns": [{ "name": "Category", "type": "dimension", "dataType": "string" }],
        "rows": [{ "name": "Sales", "type": "measure", "dataType": "number" }],
        "filters": {
          "Date": { "gte": "2024-01-01", "lte": "2024-03-31" }
        }
      },
      "chartData": [
        { "Category": "Electronics", "Sales": 150000 },
        { "Category": "Furniture", "Sales": 90000 }
      ]
    },
    "interpretation": "Showing total sales grouped by category for Q1 2024"
  }
}
```

**Implementation Notes**:
- Use NLP/LLM to parse user intent
- Map to appropriate chart type
- Extract filters from time periods (Q1, Q2, etc.)
- Return both config and ready-to-use data
- Provide human-readable interpretation

**Example Queries to Support**:
- "Show [measure] by [dimension]"
- "Compare [measure] across [dimension]"
- "Trend of [measure] over time"
- "Top 10 [dimension] by [measure]"
- "Correlation between [measure1] and [measure2]"
- Distribution queries
- Time-based queries (monthly, quarterly, yearly)

---

#### ✅ GET /api/visualization/suggestions
**Purpose**: Get AI-powered visualization suggestions

**Request**:
```json
{
  "fileId": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "type": "bar",
      "title": "Sales by Category",
      "description": "Compare sales performance across product categories",
      "columns": ["Category"],
      "rows": ["Sales"],
      "recommended": true,
      "reason": "High cardinality in Category field makes it ideal for comparison"
    },
    {
      "type": "line",
      "title": "Sales Trend Over Time",
      "description": "Visualize sales growth month by month",
      "columns": ["Date"],
      "rows": ["Sales"],
      "recommended": true,
      "reason": "Date field detected, trend analysis recommended"
    }
  ]
}
```

**Implementation Notes**:
- Analyze data characteristics (cardinality, data types, distributions)
- Recommend 3-5 most relevant visualizations
- Prioritize by usefulness (recommended flag)
- Explain why each suggestion is relevant

---

### Priority 3: Advanced Analytics (Optional but Valuable)

#### ✅ POST /api/analytics/trend-line
**Purpose**: Calculate trend line for time series

**Request**:
```json
{
  "fileId": "string",
  "xField": "Date",
  "yField": "Sales",
  "method": "linear" | "polynomial" | "exponential"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "trendPoints": [
      { "Date": "2024-01-01", "predicted": 45000 },
      { "Date": "2024-01-02", "predicted": 46000 }
    ],
    "equation": "y = 1000x + 40000",
    "r2": 0.85
  }
}
```

---

#### ✅ POST /api/analytics/statistics
**Purpose**: Calculate statistical measures

**Request**:
```json
{
  "fileId": "string",
  "field": "Sales"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "mean": 45000,
    "median": 42000,
    "std": 12000,
    "min": 10000,
    "max": 95000,
    "q1": 30000,
    "q3": 60000
  }
}
```

---

### Priority 4: Export & Sharing (Optional)

#### ✅ POST /api/visualization/export
**Purpose**: Export visualization as image

**Request**:
```json
{
  "visualizationId": "string",
  "format": "png" | "svg" | "pdf",
  "width": 1200,
  "height": 800
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://api.example.com/exports/viz-123.png",
    "expiresAt": "2024-12-31T23:59:59Z"
  }
}
```

---

#### ✅ POST /api/visualization/share
**Purpose**: Create shareable link

**Request**:
```json
{
  "visualizationId": "string",
  "permissions": "view" | "edit",
  "expiresIn": 7 // days
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "shareUrl": "https://app.example.com/shared/viz-abc123",
    "shareCode": "abc123",
    "expiresAt": "2024-12-31T23:59:59Z"
  }
}
```

---

## Data Processing Requirements

### Field Type Detection

Implement smart type detection:

```python
def detect_field_type(column_data):
    """
    Returns: {
        'type': 'dimension' | 'measure',
        'dataType': 'string' | 'number' | 'date'
    }
    """
    # Check if numeric
    if is_numeric(column_data):
        return {'type': 'measure', 'dataType': 'number'}
    
    # Check if date
    if is_date(column_data):
        return {'type': 'dimension', 'dataType': 'date'}
    
    # Default to string dimension
    return {'type': 'dimension', 'dataType': 'string'}
```

### Aggregation Logic

Support these aggregation methods:

```python
def aggregate_data(data, group_by, measure, method):
    """
    group_by: list of dimension fields
    measure: measure field name
    method: 'sum' | 'average' | 'count' | 'min' | 'max'
    """
    if method == 'sum':
        return data.groupby(group_by)[measure].sum()
    elif method == 'average':
        return data.groupby(group_by)[measure].mean()
    elif method == 'count':
        return data.groupby(group_by)[measure].count()
    elif method == 'min':
        return data.groupby(group_by)[measure].min()
    elif method == 'max':
        return data.groupby(group_by)[measure].max()
```

### Filter Application

```python
def apply_filters(data, filter_type, filter_count, measure, order_by):
    """
    filter_type: 'top' | 'bottom'
    filter_count: int
    measure: field to filter by
    """
    sorted_data = data.sort_values(by=measure, ascending=(filter_type == 'bottom'))
    return sorted_data.head(filter_count)
```

## Testing Your Integration

### 1. Test Data Preview
```bash
curl -X GET 'http://localhost:5000/api/data/preview?fileId=test123&limit=100'
```

Expected: Returns sample data with correct field types

### 2. Test Visualization Generation
```bash
curl -X POST 'http://localhost:5000/api/visualization/generate' \
  -H 'Content-Type: application/json' \
  -d '{
    "fileId": "test123",
    "vizType": "bar",
    "config": {
      "columns": [{"name": "Category", "type": "dimension"}],
      "rows": [{"name": "Sales", "type": "measure"}],
      "aggregation": "sum"
    }
  }'
```

Expected: Returns aggregated data ready for chart

### 3. Test NLQ (if implemented)
```bash
curl -X POST 'http://localhost:5000/api/visualization/nlq' \
  -H 'Content-Type: application/json' \
  -d '{
    "fileId": "test123",
    "query": "show sales by region"
  }'
```

Expected: Returns interpreted query with chart config and data

## Frontend Integration Points

Once your endpoints are ready, the frontend will:

1. **On component mount**: Call data preview to get fields
2. **When user drags fields**: Local state update (no API call)
3. **When chart renders**: Use preview data OR call generate endpoint
4. **When user submits NLQ**: Call NLQ endpoint and auto-configure chart
5. **When user saves**: Store config in database (via existing save endpoint)

## Error Handling

Return consistent error responses:

```json
{
  "success": false,
  "error": "Detailed error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "fieldName",
    "reason": "Invalid data type"
  }
}
```

Frontend will display toast notifications with the error message.

## Performance Recommendations

### Data Limits
- Preview: Max 1000 rows
- Visualization: Max 10,000 aggregated points
- NLQ: Process within 3 seconds

### Caching
- Cache data previews (5 min TTL)
- Cache aggregation results (1 min TTL)
- Cache NLQ results (10 min TTL)

### Pagination
For large datasets:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 100,
    "total": 5000,
    "hasMore": true
  }
}
```

## Security Considerations

- ✅ Validate fileId belongs to authenticated user
- ✅ Sanitize NLQ input to prevent injection
- ✅ Rate limit NLQ endpoint (expensive operation)
- ✅ Validate aggregation methods (whitelist only)
- ✅ Limit data export size

## Example Backend Implementation (Python/Flask)

```python
from flask import Flask, request, jsonify
import pandas as pd

@app.route('/api/visualization/generate', methods=['POST'])
def generate_visualization():
    data = request.json
    file_id = data['fileId']
    config = data['config']
    
    # Load data
    df = load_data(file_id)
    
    # Extract config
    columns = [f['name'] for f in config['columns']]
    rows = [f['name'] for f in config['rows']]
    aggregation = config.get('aggregation', 'sum')
    
    # Aggregate
    if aggregation == 'sum':
        result = df.groupby(columns)[rows].sum().reset_index()
    elif aggregation == 'average':
        result = df.groupby(columns)[rows].mean().reset_index()
    # ... other aggregations
    
    # Apply filters if needed
    if 'filterType' in config:
        filter_type = config['filterType']
        filter_count = config.get('filterCount', 10)
        result = result.nlargest(filter_count, rows[0]) if filter_type == 'top' else result.nsmallest(filter_count, rows[0])
    
    # Return
    return jsonify({
        'success': True,
        'data': {
            'chartData': result.to_dict('records'),
            'metadata': {
                'totalRecords': len(df),
                'filteredRecords': len(result)
            }
        }
    })
```

## Support

For questions about the frontend expectations:
- See `/services/api.service.ts` for request/response types
- See `/VISUALIZATION_IMPLEMENTATION.md` for feature overview
- See `/guidelines/VISUALIZATION_GUIDE.md` for user-facing docs

## Checklist Summary

- [ ] Implement data preview endpoint
- [ ] Implement visualization generation with aggregation
- [ ] Test with sample datasets
- [ ] (Optional) Implement NLQ endpoint
- [ ] (Optional) Implement suggestions endpoint
- [ ] (Optional) Implement analytics endpoints
- [ ] (Optional) Implement export endpoints
- [ ] Set USE_MOCK_API = false
- [ ] Load test with realistic data volumes
- [ ] Document any custom fields or behaviors

---

**Ready to integrate?** Start with Priority 1 endpoints and test incrementally!
