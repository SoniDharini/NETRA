# Feature Engineering User Guide

## Quick Start

### 1. Upload Your Dataset
1. Navigate to the **Upload** section
2. Click "Upload CSV" or drag and drop your file
3. Wait for upload to complete
4. You'll see a 5×5 preview of your data

### 2. Navigate to Preprocessing
1. Click on the **Preprocessing** tab
2. The system will automatically:
   - Load your full dataset (not just the preview)
   - Analyze all rows and columns
   - Train an ML model to discover patterns
   - Generate intelligent suggestions

### 3. Review Suggestions

#### Data Cleaning Tab
Suggestions for cleaning your data:
- **Remove Duplicates**: Eliminate duplicate rows
- **Fill Missing Values**: Impute missing data using mean/median/KNN
- **Remove Outliers**: Detect and remove anomalies
- **Encode Categorical**: Convert text categories to numbers
- **Normalize**: Scale numerical features

#### Feature Engineering Tab
ML-driven suggestions for creating new features:

**Datetime Features**
- If you have a `birthdate` column, the system suggests:
  - `birthdate_age` (calculated from current year)
  - `birthdate_year`, `birthdate_month`, `birthdate_day`
  - `birthdate_weekday`

**Numerical Interactions**
- If `price` and `quantity` are important:
  - `price_x_quantity` (interaction feature)

**Polynomial Features**
- For highly important numerical features:
  - `feature_squared`, `feature_cubed`

**Ratios**
- For related numerical features:
  - `revenue_div_cost` (profitability ratio)

**Group Aggregates**
- For categorical groupings:
  - `salary_mean_by_department`

**Text Features**
- For text columns:
  - `text_length`, `text_word_count`

### 4. Approve Features

Each suggestion shows:
- **Description**: What the feature does
- **Rationale**: Why it's recommended (ML-driven)
- **Impact**: How many columns it adds
- **New Features**: Names of created features

**To approve a feature:**
1. Click on the suggestion to expand details
2. Check the checkbox to enable it
3. The feature will appear in the "Processing Summary" panel

### 5. Apply Transformations

1. Review selected steps in the summary panel
2. Click **"Apply X Step(s)"** button
3. Wait for processing (progress bar shows status)
4. The system will:
   - Load your full dataset
   - Apply only approved steps
   - Create new features
   - Return processed dataset

### 6. Download Results

After processing:
1. Review the processing summary
2. See a preview of the processed data
3. Click **"Download Processed Data"** to get the full CSV
4. The downloaded file includes:
   - All original columns (cleaned)
   - All engineered features
   - Clear feature names

## Example Workflow

### Scenario: Customer Churn Prediction

**Original Dataset:**
```
customer_id, birthdate, signup_date, monthly_spend, support_tickets, plan_type
1001, 1985-03-15, 2020-01-10, 49.99, 2, premium
1002, 1992-07-22, 2021-05-15, 29.99, 0, basic
...
```

**After Feature Engineering:**
```
customer_id, birthdate, birthdate_age, birthdate_month, signup_date, 
signup_date_year, monthly_spend, support_tickets, plan_type, 
plan_type_target_enc, monthly_spend_x_support_tickets, 
monthly_spend_mean_by_plan_type, customer_tenure_days
```

**New Features Created:**
1. `birthdate_age` = 2026 - 1985 = 41
2. `birthdate_month` = 3
3. `signup_date_year` = 2020
4. `plan_type_target_enc` = 0.73 (mean churn rate for premium)
5. `monthly_spend_x_support_tickets` = 49.99 × 2 = 99.98
6. `monthly_spend_mean_by_plan_type` = 54.32 (avg for premium users)
7. `customer_tenure_days` = days since signup

## Best Practices

### ✅ Do's
- **Review all suggestions** before applying
- **Read the rationale** to understand why a feature is suggested
- **Start with recommended features** (marked with green badge)
- **Test with a subset** if you have a very large dataset
- **Download the processed data** for reproducibility

### ❌ Don'ts
- **Don't apply all suggestions blindly** - some may not be relevant
- **Don't skip the rationale** - understanding features is important
- **Don't use preview data for analysis** - always use the full dataset
- **Don't forget to download** - the processed data is stored temporarily

## Understanding Suggestions

### Recommended Badge (Green)
Features marked as "Recommended" have:
- High potential impact on model performance
- Strong ML-driven justification
- Low risk of overfitting

### Impact Description
- **"Adds 1 numerical column"**: Creates one new feature
- **"Adds 4 numerical columns"**: Creates four new features
- **"Replaces categorical with 1 numerical"**: Removes original, adds encoded version

### Rationale Types

**ML Discovery**
- "ML Discovery: feature_name is a top predictor (Importance: 0.234)"
- Based on Gradient Boosting model analysis

**Statistical**
- "Skewness=2.45. Log transform normalizes distribution"
- Based on data distribution analysis

**Domain Knowledge**
- "Age is a stronger predictive signal than raw dates"
- Based on common ML best practices

## Troubleshooting

### "No Dataset Found"
**Solution**: Go back to Upload and upload a dataset first

### "Failed to load AI suggestions"
**Solution**: 
1. Check if backend is running
2. Verify you're logged in
3. Refresh the page

### "Processing failed"
**Solution**:
1. Check if you selected at least one step
2. Verify the dataset is still available
3. Try with fewer steps

### "Download failed"
**Solution**:
1. Ensure processing completed successfully
2. Check browser's download settings
3. Try again

## Advanced Features

### Session Persistence
- Your dataset and selections are saved
- You can refresh the page without losing progress
- Dataset persists across login sessions

### Multiple Datasets
- Upload multiple datasets
- Switch between them using the file selector
- Each dataset has independent suggestions

### Reproducibility
- All transformations are deterministic
- Same input + same steps = same output
- Download includes metadata for traceability

## Support

For issues or questions:
1. Check the console for error messages
2. Review the implementation documentation
3. Contact the development team

---

**Version**: 1.0
**Last Updated**: 2026-01-27
**Status**: Production Ready ✅
