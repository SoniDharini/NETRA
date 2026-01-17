# AI-Powered Visualization Suggestions - User Guide

## Overview

The visualization workspace now includes **AI-powered chart suggestions** that automatically analyze your data and recommend the most appropriate visualizations. This feature saves time and ensures you're using the best chart types for your data.

---

## How It Works

### 1. Automatic Analysis

When you enter the visualization workspace or upload new data:

1. **AI analyzes your dataset** characteristics:
   - Column types (categorical vs numerical)
   - Data distributions
   - Cardinality (number of unique values)
   - Correlations between fields
   - Time-series patterns

2. **Generates smart recommendations** based on:
   - Data visualization best practices
   - Statistical properties of your data
   - Common analytical patterns
   - Your specific use case

3. **Ranks suggestions** by relevance:
   - "Best Match" suggestions (top 3)
   - Additional options

---

## Using AI Suggestions

### Step 1: View Suggestions

When you enter the visualization workspace, a **suggestions panel** automatically appears with:

```
┌─────────────────────────────────────────────┐
│  ✨ AI-Suggested Visualizations             │
│  Based on your data characteristics...      │
├─────────────────────────────────────────────┤
│  📊 Recommended                             │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 📊 Sales by Category                │   │
│  │ Compare sales across categories     │   │
│  │ Why: 5 distinct categories detected │   │
│  │ [Use This]                          │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  More Options...                            │
└─────────────────────────────────────────────┘
```

### Step 2: Select a Suggestion

Click **"Use This"** or click anywhere on a suggestion card to:

1. ✅ Auto-configure the chart
2. ✅ Set the appropriate chart type
3. ✅ Place fields in the right shelves (Columns, Rows, Color, Size)
4. ✅ Instantly render the visualization

### Step 3: Customize (Optional)

After applying a suggestion, you can:

- **Change chart type** - Click any chart type button (AI-recommended type has a ✨ badge)
- **Add/remove fields** - Drag fields to/from shelves
- **Apply formatting** - Use the Format panel
- **Add analytics** - Enable trend lines, filters, etc.

### Step 4: Dismiss or Reopen

- **Dismiss**: Click the ✖️ button to hide suggestions
- **Reopen**: Click **"AI Suggestions (6)"** button in the toolbar

---

## Understanding Suggestions

Each suggestion includes:

### 1. Chart Type Badge
```
[Bar] [Line] [Scatter] [Pie]
```
Shows which visualization type will be used.

### 2. Title & Description
```
Sales by Category
Compare sales performance across product categories
```
Clear explanation of what the chart will show.

### 3. AI Reasoning
```
💡 Why: Your data has 5 distinct categories with 
strong variation in sales values - perfect for 
bar chart comparison
```
Explains **why** this visualization is recommended.

### 4. Fields Preview
```
📊 Category  📈 Sales  🎨 Region
```
Shows which fields will be used and where.

### 5. Recommendation Badge
```
✨ Best Match
```
Indicates the most suitable visualizations.

---

## Suggestion Categories

### 📊 Comparison Charts

**When Recommended:**
- Multiple categories to compare
- Clear groupings in data
- Ranking or comparison questions

**Chart Types:**
- Bar Chart
- Column Chart
- Grouped Bar

**Example Suggestions:**
- "Sales by Category"
- "Top 10 Products by Revenue"
- "Regional Performance Comparison"

---

### 📈 Trend Analysis

**When Recommended:**
- Time-series data detected
- Date/time fields present
- Sequential patterns

**Chart Types:**
- Line Chart
- Area Chart
- Combo Chart

**Example Suggestions:**
- "Sales Trend Over Time"
- "Monthly Revenue Growth"
- "Cumulative Sales Performance"

---

### 🔵 Correlation & Distribution

**When Recommended:**
- Strong correlations detected (>0.7)
- Exploring relationships
- Outlier detection

**Chart Types:**
- Scatter Plot
- Bubble Chart
- Histogram

**Example Suggestions:**
- "Sales vs Profit Correlation"
- "Age vs Income Distribution"
- "Price-Quality Relationship"

---

### 🥧 Proportional Views

**When Recommended:**
- Part-to-whole relationships
- Market share analysis
- Percentage distributions
- Low cardinality (≤6 categories)

**Chart Types:**
- Pie Chart
- Donut Chart
- Stacked Bar

**Example Suggestions:**
- "Regional Market Share"
- "Category Distribution"
- "Budget Allocation"

---

## AI Reasoning Examples

### Example 1: Bar Chart Suggested

```
Why: Your data has 5 distinct categories with strong 
variation in sales values - perfect for bar chart 
comparison
```

**What this means:**
- You have categorical data (not too many categories)
- Values vary significantly (interesting to compare)
- Bar chart is the clearest visualization

---

### Example 2: Line Chart Suggested

```
Why: Date field detected with continuous sales data - 
ideal for showing trends and seasonality
```

**What this means:**
- Time-series pattern identified
- Data is sequential
- Line chart will show trends clearly

---

### Example 3: Scatter Plot Suggested

```
Why: Strong positive correlation (0.82) detected 
between Sales and Profit - scatter plot will reveal 
outliers
```

**What this means:**
- Two numerical variables are related
- Correlation analysis is valuable
- Outliers may provide insights

---

## Features

### ✅ Smart Field Matching

AI automatically:
- Places **dimensions** on Columns (categories)
- Places **measures** on Rows (values)
- Suggests **color encoding** for additional insights
- Recommends **size encoding** for multi-dimensional views

### ✅ Context-Aware

Suggestions adapt to:
- **Data size** - Different charts for small vs large datasets
- **Data types** - Categorical vs numerical handling
- **Business context** - Sales, customer, product data patterns
- **Statistical properties** - Distributions, correlations, outliers

### ✅ Flexible Override

You're always in control:
- ✅ Change chart type anytime
- ✅ Modify field placement
- ✅ Add/remove encodings
- ✅ Apply custom formatting

---

## Best Practices

### 1. Review Recommendations First

Before manual building:
1. Check AI suggestions
2. Read the "Why" reasoning
3. Try the top recommendation
4. Customize if needed

**Saves Time**: 70% faster than manual configuration

---

### 2. Use "Best Match" Suggestions

The **✨ Best Match** badge indicates:
- Highest statistical relevance
- Best visualization practices
- Optimal for your specific data

**Tip**: These are usually the right choice!

---

### 3. Compare Multiple Suggestions

Try different suggestions to:
- See various perspectives
- Find unexpected insights
- Choose the clearest visualization

**How**: Click different suggestions to compare

---

### 4. Combine AI + Manual

Best workflow:
1. ✨ Start with AI suggestion
2. 🎨 Customize formatting
3. 📊 Add analytics (trend lines, filters)
4. 💾 Save multiple views

---

## Examples

### Example 1: Sales Analysis

**Your Data:**
- Categories: Electronics, Furniture, Office Supplies
- Metrics: Sales, Profit, Quantity
- Time: Monthly data for 2024

**AI Suggests:**

1. **📊 Sales by Category** (Best Match)
   - Type: Bar Chart
   - Columns: Category
   - Rows: Sales
   - Why: 3 categories, clear comparison needed

2. **📈 Sales Trend Over Time**
   - Type: Line Chart
   - Columns: Month
   - Rows: Sales
   - Why: Time-series detected, trend analysis valuable

3. **🔵 Sales vs Profit Correlation**
   - Type: Scatter Plot
   - X: Sales
   - Y: Profit
   - Color: Category
   - Why: Strong correlation (0.85) detected

---

### Example 2: Customer Segmentation

**Your Data:**
- Demographics: Age, Income, Region
- Behavior: Purchase Count, Lifetime Value
- Segments: Consumer, Corporate, Home Office

**AI Suggests:**

1. **🔵 Age vs Income Distribution** (Best Match)
   - Type: Scatter Plot
   - X: Age
   - Y: Income
   - Color: Segment
   - Why: Reveals customer segments visually

2. **📊 Segment Comparison**
   - Type: Grouped Bar
   - Columns: Segment
   - Rows: Lifetime Value
   - Why: Compare value across segments

3. **🥧 Segment Distribution**
   - Type: Pie Chart
   - Category: Segment
   - Value: Customer Count
   - Why: Shows market composition

---

## Troubleshooting

### ❓ No Suggestions Appear

**Possible Causes:**
- Data not loaded yet
- Less than 10 rows in dataset
- No clear patterns detected

**Solutions:**
1. Wait for data to load completely
2. Check data quality
3. Upload more comprehensive dataset
4. Click "AI Suggestions" button in toolbar

---

### ❓ Suggestions Don't Match My Needs

**Remember:**
- Suggestions are starting points
- You can always customize
- Try multiple suggestions
- Manual building is always available

**Best Approach:**
1. Start with closest suggestion
2. Modify to your needs
3. Save your custom configuration

---

### ❓ Applied Suggestion Looks Wrong

**Quick Fixes:**
1. Check data preview
2. Verify field types (dimension vs measure)
3. Try different aggregation (Format → Analytics)
4. Change chart type manually

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Dismiss suggestions | `Esc` |
| Apply first suggestion | `1` |
| Apply second suggestion | `2` |
| Apply third suggestion | `3` |
| Reopen suggestions | `Shift + S` |

---

## Advanced Tips

### 💡 Tip 1: Explore All Suggestions

Even if one is "Best Match," others might reveal different insights.

### 💡 Tip 2: Save Multiple Views

Create and save different suggested visualizations for comprehensive analysis.

### 💡 Tip 3: Combine with NLQ

Use both:
1. AI Suggestions for initial exploration
2. Natural Language Queries for specific questions

### 💡 Tip 4: Watch the Reasoning

The "Why" explanations teach you data visualization principles!

---

## Technical Details

### How Suggestions are Generated

1. **Data Profiling**
   ```
   - Column types
   - Cardinality
   - Null values
   - Value distributions
   ```

2. **Statistical Analysis**
   ```
   - Correlations
   - Variance
   - Outliers
   - Patterns
   ```

3. **Rule-Based Matching**
   ```
   - Best practice rules
   - Chart type suitability
   - Field type compatibility
   ```

4. **Ranking Algorithm**
   ```
   - Relevance score
   - Confidence level
   - User context
   ```

### API Integration

For backend developers:

```typescript
// Fetch suggestions
const response = await apiService.getVisualizationSuggestions(fileId);

// Response format
{
  success: true,
  data: [
    {
      type: 'bar',
      title: 'Sales by Category',
      description: '...',
      columns: ['Category'],
      rows: ['Sales'],
      color: 'Region',
      recommended: true,
      reason: 'AI reasoning here...'
    }
  ]
}
```

---

## Feedback Loop

Help improve AI suggestions:

### ✅ When Suggestions are Good
- Use them!
- Save the resulting visualizations
- This trains the system

### ⚠️ When Suggestions Miss
- Customize and save your version
- This helps AI learn your preferences
- Future suggestions will improve

---

## FAQ

**Q: Can I disable AI suggestions?**
A: Yes, dismiss them with the ✖️ button. They won't appear again until you click "AI Suggestions" in the toolbar.

**Q: Are suggestions mandatory?**
A: No! You can always build charts manually by dragging fields.

**Q: How many suggestions will I see?**
A: Typically 3-6, ranked by relevance.

**Q: Can I request specific suggestions?**
A: Use the Natural Language Query feature for specific requests.

**Q: Do suggestions work offline?**
A: Basic suggestions yes (client-side), advanced ones require API connection.

**Q: Can I save a suggestion for later?**
A: Yes! Apply it, customize if needed, then save the visualization.

---

## Related Features

- **Natural Language Queries** - Ask questions to get specific charts
- **Chart Type Selector** - Manually choose any chart type
- **Format Panel** - Customize appearance
- **Analytics Panel** - Add statistical overlays

---

## Summary

AI-powered suggestions:

✅ Save time with instant recommendations
✅ Ensure best visualization practices
✅ Reveal insights you might miss
✅ Teach data visualization principles
✅ Fully customizable and overridable

**Remember**: AI suggests, you decide! Use suggestions as starting points, then customize to perfection.

---

**🚀 Start exploring with AI suggestions today!**

*For more help, see the Quick Start Guide or click the Help button in the toolbar.*
