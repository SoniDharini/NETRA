# Visualization Components

This directory contains all components for the Tableau-like visualization workspace.

## Components Overview

### Core Visualization Components

#### `DataPanel.tsx`
**Purpose**: Displays draggable data fields organized by type

**Features**:
- Auto-categorizes fields as Dimensions or Measures
- Drag-and-drop enabled for all fields
- Visual indicators for data types (string, number, date)
- Scrollable field list
- Legend explaining field types

**Usage**:
```tsx
<DataPanel fields={fields} />
```

---

#### `ChartShelf.tsx`
**Purpose**: Drop zones for building chart configuration

**Features**:
- 4 drop zones: Columns, Rows, Color, Size
- Visual feedback on drag hover
- Type validation (e.g., Size only accepts measures)
- Remove fields with X button
- Supports multiple fields per zone

**Usage**:
```tsx
<ChartShelf
  config={chartConfig}
  onUpdateConfig={handleUpdateConfig}
  fields={fields}
/>
```

---

#### `ChartCanvas.tsx`
**Purpose**: Renders the actual visualization

**Features**:
- 7 chart types supported
- Responsive sizing
- Empty state with helpful message
- Export and fullscreen controls
- Dynamic color schemes

**Chart Types**:
- Bar Chart
- Line Chart
- Area Chart
- Scatter Plot
- Pie Chart
- Histogram
- Heatmap (structure ready)

**Usage**:
```tsx
<ChartCanvas
  config={chartConfig}
  chartType={chartType}
  data={chartData}
  onExport={handleExport}
/>
```

---

### UI Components

#### `ChartTypeSelector.tsx`
**Purpose**: Chart type selection toolbar

**Features**:
- Icon buttons for each chart type
- Tooltips with chart names
- Active state highlighting
- Responsive layout

**Usage**:
```tsx
<ChartTypeSelector
  selectedType={chartType}
  onSelectType={setChartType}
/>
```

---

#### `VisualizationToolbar.tsx`
**Purpose**: Top toolbar with global actions

**Features**:
- Navigation (Home, Dashboard)
- History (Undo, Redo)
- Actions (Save, Export, Share)
- Help button
- Saved count badge

**Usage**:
```tsx
<VisualizationToolbar
  onNavigate={handleNavigate}
  onSave={handleSave}
  savedCount={savedCount}
  onShowHelp={showHelp}
/>
```

---

### Advanced Components

#### `NLQPanel.tsx`
**Purpose**: Natural Language Query interface

**Features**:
- Query input with autocomplete
- Suggested questions by category
- Query history (last 10)
- Processing state indicator
- Color-coded suggestions

**Usage**:
```tsx
<NLQPanel
  onQuerySubmit={handleQuery}
  isProcessing={loading}
/>
```

---

#### `FormatPanel.tsx`
**Purpose**: Chart formatting and styling controls

**Features**:
- 6 color schemes
- Font size slider
- Opacity control
- Toggle grid lines, legend, labels
- Tabbed interface (Colors, Text, Display)

**Usage**:
```tsx
<FormatPanel onFormatChange={handleFormatChange} />
```

**Config Interface**:
```typescript
interface FormatConfig {
  colorScheme: string;
  fontSize: number;
  showGridLines: boolean;
  showLegend: boolean;
  showLabels: boolean;
  chartOpacity: number;
}
```

---

#### `AnalyticsPanel.tsx`
**Purpose**: Advanced analytics and aggregation options

**Features**:
- Aggregation method selection
- Trend line toggle
- Reference lines (average, median)
- Top/Bottom N filtering
- Quick statistics

**Usage**:
```tsx
<AnalyticsPanel onApplyAnalytics={handleAnalytics} />
```

**Config Interface**:
```typescript
interface AnalyticsConfig {
  showTrendLine: boolean;
  showAverage: boolean;
  showMedian: boolean;
  aggregation: 'sum' | 'average' | 'count' | 'min' | 'max';
  filterType?: 'top' | 'bottom';
  filterCount?: number;
}
```

---

#### `QuickStartGuide.tsx`
**Purpose**: Onboarding modal for new users

**Features**:
- 3-step tutorial
- Visual examples
- Quick tips section
- Dismissible
- Can be reopened from Help button

**Usage**:
```tsx
{showGuide && <QuickStartGuide onClose={() => setShowGuide(false)} />}
```

---

## Type Definitions

### Field Item
```typescript
interface FieldItem {
  name: string;
  type: 'dimension' | 'measure';
  dataType: 'string' | 'number' | 'date';
}
```

### Chart Config
```typescript
interface ChartConfig {
  columns: FieldItem[];
  rows: FieldItem[];
  color?: FieldItem;
  size?: FieldItem;
}
```

### Saved Visualization
```typescript
interface SavedVisualization {
  id: string;
  name: string;
  config: ChartConfig;
  chartType: string;
  timestamp: Date;
}
```

## Component Hierarchy

```
Visualization (Main Container)
├── DndProvider (react-dnd wrapper)
├── QuickStartGuide (modal)
├── VisualizationToolbar
├── Tabs (Worksheet | Ask Data)
├── Layout (3-column)
│   ├── Left Panel
│   │   ├── DataPanel (worksheet mode)
│   │   └── NLQPanel (ask data mode)
│   ├── Center Panel
│   │   ├── ChartTypeSelector
│   │   ├── ChartShelf
│   │   └── ChartCanvas
│   └── Right Panel (tabs)
│       ├── Saved Visualizations
│       └── Format/Analytics
│           ├── FormatPanel
│           └── AnalyticsPanel
```

## Data Flow

1. **Field Detection**
   ```
   Project Data → Auto-classify → FieldItem[] → DataPanel
   ```

2. **Chart Building**
   ```
   User Drags Field → ChartShelf Update → ChartConfig → ChartCanvas
   ```

3. **Visualization Rendering**
   ```
   ChartConfig + Data → Recharts → Rendered Chart
   ```

4. **Natural Language Query**
   ```
   NLQ Input → API/Parser → ChartConfig → Auto-render
   ```

## Styling

All components use:
- Tailwind CSS for styling
- ShadCN UI component primitives
- Consistent color palette
- Responsive breakpoints
- Smooth transitions

## Dependencies

- `react-dnd` - Drag and drop
- `react-dnd-html5-backend` - HTML5 backend
- `recharts` - Chart rendering
- `lucide-react` - Icons
- `sonner` - Toast notifications
- ShadCN UI components

## Best Practices

### Performance
- Use memoization for field lists
- Debounce drag operations
- Lazy load chart data
- Conditional rendering for heavy components

### Accessibility
- Keyboard navigation support
- ARIA labels on interactive elements
- Focus management in modals
- Screen reader friendly

### Error Handling
- Validate field types before drop
- Show empty states
- Display error messages
- Graceful degradation

## Testing

### Unit Tests
```typescript
// Example test
describe('ChartCanvas', () => {
  it('renders empty state when no config', () => {
    const config = { columns: [], rows: [] };
    render(<ChartCanvas config={config} chartType="bar" data={[]} />);
    expect(screen.getByText(/no data to display/i)).toBeInTheDocument();
  });
});
```

### Integration Tests
```typescript
// Example test
describe('Drag and Drop Workflow', () => {
  it('updates chart when field is dragged to columns', () => {
    // Setup DnD test environment
    // Drag field
    // Assert config updated
  });
});
```

## Extending

### Adding New Chart Type

1. Add to `ChartTypeSelector.tsx`:
```typescript
{ id: 'newchart', label: 'New Chart', icon: NewIcon }
```

2. Add rendering in `ChartCanvas.tsx`:
```typescript
case 'newchart':
  return <NewChartComponent data={chartData} />;
```

### Adding New Format Option

1. Update `FormatConfig` interface in `FormatPanel.tsx`
2. Add UI control in appropriate tab
3. Pass config to `ChartCanvas` and apply

### Adding New Analytics

1. Update `AnalyticsConfig` interface in `AnalyticsPanel.tsx`
2. Add UI control
3. Implement calculation logic in chart rendering

## Common Issues

### Drag and Drop Not Working
- Ensure `DndProvider` wraps all components
- Check `HTML5Backend` is imported correctly
- Verify `useDrag` and `useDrop` hooks are used properly

### Charts Not Rendering
- Check that `data` prop has valid array
- Verify field names exist in data
- Check console for Recharts errors

### Performance Issues
- Reduce data points (max 10,000)
- Use aggregation for large datasets
- Implement virtualization for field lists

## Resources

- [React DnD Documentation](https://react-dnd.github.io/react-dnd/)
- [Recharts Documentation](https://recharts.org/)
- [ShadCN UI](https://ui.shadcn.com/)
- [Tableau Public](https://public.tableau.com/) - For UX inspiration

## Maintenance

### Regular Tasks
- Update dependencies quarterly
- Review accessibility
- Optimize bundle size
- Update documentation

### Breaking Changes
If you modify interfaces:
1. Update type definitions
2. Update all consuming components
3. Update tests
4. Update documentation

---

**Questions?** Check the main visualization guide at `/guidelines/VISUALIZATION_GUIDE.md`
