# Visualization Workspace - Quick Reference Card

## 🎯 Quick Start (30 seconds)

### Method 1: AI-Powered (Fastest! ⚡)
1. **Review** AI suggestions that appear automatically
2. **Click** "Use This" on any suggestion
3. **Customize** if needed (optional)
4. **Save** your visualization

### Method 2: Manual Drag & Drop
1. **Drag** a field from the Data panel (left)
2. **Drop** it on "Columns" or "Rows"
3. **Select** a chart type from the toolbar
4. **Save** your visualization

Done! 🎉

---

## 🎨 Interface Layout

```
┌─────────────────────────────────────────────────────────┐
│  [Home] [Undo] [Redo]     [Help] [Share] [Export] [Save]│
├─────────────────────────────────────────────────────────┤
│  [Worksheet] [Ask Data]                                  │
├──────────┬───────────────────────────────┬──────────────┤
│   DATA   │    CHART TYPE SELECTOR        │   SAVED /    │
│  PANEL   ├───────────────────────────────┤   FORMAT     │
│          │    COLUMNS: [Drop here]       │              │
│ ✓ Fields │    ROWS:    [Drop here]       │  • Save 1    │
│ ✓ Drag   │    COLOR:   [Drop here]       │  • Save 2    │
│          │    SIZE:    [Drop here]       │              │
│          ├───────────────────────────────┤  [Format]    │
│          │                               │  Colors      │
│          │      CHART CANVAS             │  Text        │
│          │                               │  Display     │
│          │   [Your visualization]        │  Analytics   │
│          │                               │              │
└──────────┴───────────────────────────────┴──────────────┘
```

---

## 📊 Field Types

| Icon | Color | Type | Description | Examples |
|------|-------|------|-------------|----------|
| 📝 | Green | **Dimension** | Categories, groups | Region, Product, Date |
| 🔢 | Blue | **Measure** | Numbers to aggregate | Sales, Profit, Quantity |

**Pro Tip**: Put dimensions on Columns, measures on Rows for best results!

---

## 🎨 Chart Types & When to Use

| Chart | Use When | Example |
|-------|----------|---------|
| 📊 **Bar** | Comparing categories | Sales by Region |
| 📈 **Line** | Showing trends over time | Monthly Revenue |
| 🔵 **Scatter** | Finding correlations | Price vs Quality |
| 🥧 **Pie** | Showing proportions | Market Share |
| 📉 **Area** | Cumulative totals | Total Sales Over Time |
| 📊 **Histogram** | Distributions | Age Distribution |

---

## 🎯 Common Tasks

### Create a Basic Chart
1. Drag dimension → Columns
2. Drag measure → Rows
3. Done!

### Compare Across Categories
```
Columns: Category
Rows: Sales
Type: Bar Chart
```

### Show Trend Over Time
```
Columns: Date
Rows: Revenue
Type: Line Chart
```

### Add Color Encoding
```
Drag any field → Color shelf
```
Chart will color by that field!

### Filter Top 10
1. Go to Format tab (right)
2. Analytics section
3. Select "Top" filter
4. Set count to 10

### Save Visualization
1. Click "Save" in toolbar
2. Find in "Saved" tab (right)
3. Click to reload anytime

---

## 💬 Ask Data Mode

### Quick Questions

| Ask This | Get This |
|----------|----------|
| "Show sales by region" | Bar chart: Sales by Region |
| "Sales trend over time" | Line chart: Sales by Date |
| "Top 10 products" | Filtered bar chart |
| "Compare profit across categories" | Multi-bar comparison |
| "Correlation between X and Y" | Scatter plot |

### Tips
- Use keywords: show, compare, trend, top, correlation
- Be specific: "Q1 sales" vs just "sales"
- Try suggestions first!

---

## 🎨 Formatting Shortcuts

| Want This | Do This |
|-----------|---------|
| Different colors | Format tab → Colors → Pick scheme |
| Bigger text | Format tab → Text → Adjust slider |
| Hide grid | Format tab → Display → Toggle off |
| Trend line | Format tab → Analytics → Check trend |
| Show average | Format tab → Analytics → Check average |

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Submit NLQ query |
| `Esc` | Clear selection / Close modal |
| `?` | Show help (when available) |

---

## ✨ AI Suggestions (NEW!)

### What They Are
Smart recommendations based on your data

### When They Appear
- Automatically when you load data
- Click "AI Suggestions" button in toolbar

### How to Use
```
1. See suggestions panel at top
2. Read "Why" explanation  
3. Click "Use This" to apply
4. Chart appears instantly!
```

### After Applying
- ✨ badge shows AI-recommended chart type
- You can still change anything
- Customize as needed

## 🔧 Troubleshooting

### ❌ "No data to display"
**Fix**: Drag fields to both Columns AND Rows OR use AI suggestions

### ❌ Chart looks wrong
**Fix**: Check field types - swap if needed

### ❌ Can't drag fields
**Fix**: Refresh page, ensure JavaScript enabled

### ❌ Too many categories
**Fix**: Use Top N filter (Format tab → Analytics)

### ❌ Numbers not aggregating
**Fix**: Check field is blue (measure), not green (dimension)

---

## 💡 Pro Tips

### Tip #1: Color by Category
Add a dimension to Color shelf for automatic color grouping

### Tip #2: Size by Value
Add a measure to Size shelf for bubble charts

### Tip #3: Multiple Measures
Drag multiple measures to Rows for multi-series charts

### Tip #4: Save Often
Save different views for your report - you'll thank yourself later!

### Tip #5: Start Simple
Build simple charts first, then add complexity

### Tip #6: Use Aggregations
Sum for totals, Average for means, Count for frequencies

---

## 📐 Best Practices

### DO ✅
- Use appropriate chart types
- Keep it simple (2-4 fields max)
- Label axes clearly
- Use color purposefully
- Save multiple views

### DON'T ❌
- Use pie charts for >6 categories
- Put measures on Columns
- Overcomplicate visualizations
- Use too many colors
- Forget to save your work!

---

## 🎯 Chart Selection Guide

**Goal: Compare Categories**
→ Use Bar Chart

**Goal: Show Change Over Time**
→ Use Line or Area Chart

**Goal: Find Relationships**
→ Use Scatter Plot

**Goal: Show Parts of Whole**
→ Use Pie Chart (if <6 parts)

**Goal: Show Distribution**
→ Use Histogram

**Goal: Highlight Values**
→ Use Color or Size encoding

---

## 🔗 Quick Links

- **Full Guide**: `/guidelines/VISUALIZATION_GUIDE.md`
- **Backend Integration**: `/BACKEND_INTEGRATION_CHECKLIST.md`
- **Component Docs**: `/components/visualization/README.md`
- **Implementation**: `/VISUALIZATION_IMPLEMENTATION.md`

---

## 🆘 Need Help?

1. Click **Help** button (toolbar)
2. Review **Quick Start Guide** (appears automatically)
3. Try **suggested questions** in Ask Data mode
4. Check the full documentation

---

## 🎓 Learning Path

**Beginner** (5 min)
1. Create your first chart
2. Try different chart types
3. Save a visualization

**Intermediate** (15 min)
1. Use color and size encoding
2. Try Ask Data mode
3. Apply filters
4. Customize formatting

**Advanced** (30 min)
1. Multi-measure charts
2. Custom aggregations
3. Trend lines and analytics
4. Build a dashboard (multiple saved views)

---

**Remember**: The best way to learn is by doing. Start dragging and dropping!

Happy visualizing! 📊✨
