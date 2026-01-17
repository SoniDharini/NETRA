# Visualization Workspace Guide

## Overview

The ML Analysis Platform now features a comprehensive Tableau-like visualization workspace that enables drag-and-drop chart creation, natural language queries, and advanced analytics.

## Architecture

### Components Structure

```
components/visualization/
├── DataPanel.tsx           - Displays draggable fields (dimensions & measures)
├── ChartShelf.tsx          - Drop zones for Rows, Columns, Color, Size
├── ChartTypeSelector.tsx   - Chart type selection buttons
├── ChartCanvas.tsx         - Renders the actual visualization
├── VisualizationToolbar.tsx - Top toolbar with actions
├── NLQPanel.tsx            - Natural Language Query interface
├── FormatPanel.tsx         - Chart formatting controls
└── AnalyticsPanel.tsx      - Analytics options (trend lines, aggregations)
```

## Features

### 1. Worksheet Mode (Main Interface)

#### Left Panel - Data Panel
- **Dimensions**: Categorical fields (text, dates)
  - Green icons
  - Used for grouping and categorization
  
- **Measures**: Numerical fields
  - Blue icons
  - Used for aggregations and calculations

#### Chart Shelf (Drag & Drop Areas)
- **Columns**: Horizontal axis configuration
- **Rows**: Vertical axis configuration
- **Color**: Color encoding for data points
- **Size**: Size encoding (measures only)

Drag fields from the Data Panel to these shelves to build visualizations.

#### Chart Types Available
- Bar Chart
- Line Chart
- Scatter Plot
- Pie Chart
- Area Chart
- Histogram
- Heatmap (coming soon)

### 2. Ask Data Mode (Natural Language Queries)

Use natural language to create visualizations:

**Example Queries:**
- "Show sales by category"
- "Compare profit across regions"
- "Sales trend over time"
- "Top 10 products by revenue"
- "Correlation between sales and profit"

The system automatically:
1. Interprets your query
2. Selects appropriate chart type
3. Configures axes and data
4. Switches to worksheet view to display results

### 3. Right Panel

#### Saved Tab
- View all saved visualizations
- Click to load a saved configuration
- Shows timestamp for each save

#### Format Tab

**Colors**
- Choose from 6 color schemes:
  - Default (Blue-Purple gradient)
  - Cool (Cyan-Blue)
  - Warm (Orange-Red)
  - Earth (Gray tones)
  - Ocean (Blue shades)
  - Forest (Green shades)
- Adjust chart opacity (0-100%)

**Text**
- Font size control (8-24px)
- Toggle data labels on/off

**Display**
- Toggle grid lines
- Toggle legend
- Control chart elements visibility

**Analytics**
- Aggregation methods: Sum, Average, Count, Min, Max
- Trend line overlay
- Average/Median reference lines
- Top/Bottom N filters

## Workflow

### Creating a Visualization

1. **Start in Worksheet Mode**
   - Data is automatically loaded from your dataset
   - Fields are categorized as dimensions or measures

2. **Build Your Chart**
   - Drag a dimension to Columns (e.g., "Category")
   - Drag a measure to Rows (e.g., "Sales")
   - Chart automatically renders

3. **Customize**
   - Select chart type from toolbar
   - Add Color encoding for additional dimension
   - Add Size encoding for bubble charts
   - Adjust formatting in the Format panel

4. **Save**
   - Click "Save" in the toolbar
   - Visualization is added to Saved list
   - Can be loaded anytime

5. **Export**
   - Click "Export" to download as image
   - Use "Share" to get shareable link

### Using Natural Language Queries

1. **Switch to Ask Data Mode**
   - Click "Ask Data" tab

2. **Enter Your Question**
   - Type in natural language
   - Use suggested questions as templates
   - Press Enter or click Send

3. **View Results**
   - System processes query
   - Auto-configures visualization
   - Switches to worksheet view

4. **Refine**
   - Adjust configuration in worksheet mode
   - Save if satisfied

## Data Requirements

### Automatic Field Detection

The system automatically classifies fields:

- **Numbers** → Measures (can be aggregated)
- **Text/Strings** → Dimensions (for grouping)
- **Dates** → Dimensions (with special date handling)

### Data Sources

- Project data preview (from upload/preprocessing)
- Mock data (for demonstration when no data uploaded)
- Can be extended to connect to live databases

## Advanced Features

### Analytics Options

**Aggregations**
- Sum: Total of all values
- Average: Mean value
- Count: Number of records
- Min: Minimum value
- Max: Maximum value

**Reference Lines**
- Trend Line: Linear regression
- Average Line: Mean reference
- Median Line: Median reference

**Filters**
- Top N: Show top performers
- Bottom N: Show bottom performers
- Adjustable count (1-50)

### Multiple Visualizations

- Save multiple different views
- Build a collection for reporting
- Each save preserves:
  - Chart type
  - Field configuration
  - Color/size encoding
  - Timestamp

## Keyboard Shortcuts

- **Enter**: Submit NLQ query
- **Ctrl/Cmd + S**: Save visualization
- **Esc**: Clear current selection

## Best Practices

### Choosing Chart Types

- **Bar Chart**: Compare categories, show rankings
- **Line Chart**: Show trends over time
- **Scatter Plot**: Explore correlations
- **Pie Chart**: Show proportions (max 6-8 categories)
- **Area Chart**: Show cumulative totals over time
- **Histogram**: Show distribution of a single measure

### Effective Visualizations

1. **Keep it Simple**
   - Use 2-4 fields maximum
   - Avoid cluttered legends

2. **Color Usage**
   - Use color for categorical differences
   - Choose accessible color schemes
   - Limit to 8 colors per chart

3. **Axis Configuration**
   - Put categories on columns
   - Put measures on rows
   - Use appropriate aggregations

4. **Labels and Legends**
   - Show labels when data points are few
   - Hide labels when chart is crowded
   - Always show legend for multi-series

## Integration with Backend

### API Endpoints Used

The visualization system can integrate with:

```typescript
// Get visualization suggestions
apiService.getVisualizationSuggestions(fileId)

// Generate visualization from config
apiService.generateVisualization(fileId, vizType, config)

// Process natural language query
apiService.processNLQ(fileId, query)
```

### Mock vs Real API

Toggle in `/services/api.service.ts`:
```typescript
const USE_MOCK_API = true; // Set to false when backend is ready
```

## Troubleshooting

### No Data Showing
- Ensure data is uploaded and preprocessed
- Check that fields are properly classified
- Verify data preview is available

### Chart Not Rendering
- Add at least one field to Rows or Columns
- Check that field types match chart requirements
- Try a different chart type

### Drag and Drop Not Working
- Ensure browser supports HTML5 DnD
- Check console for React DnD errors
- Refresh the page

## Future Enhancements

Planned features:
- Dashboard mode (multiple visualizations)
- Custom calculated fields
- Geographic maps
- Advanced filtering UI
- Real-time data updates
- Collaborative editing
- Export to various formats (SVG, PDF, Excel)
- Custom color palettes
- Animation and transitions

## Support

For issues or feature requests, refer to the main project documentation or contact the development team.
