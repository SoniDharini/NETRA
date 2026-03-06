import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional

def clean_for_viz(val):
    """Convert NaN/Inf to None for JSON."""
    if isinstance(val, (float, np.floating)):
        if np.isnan(val) or np.isinf(val):
            return None
    if pd.isna(val):
        return None
    return val


class VisualizationService:
    """
    Service for intelligent visualization recommendations based on dataset analysis.
    """

    def generate_recommendations(self, df: pd.DataFrame, profile: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Analyze dataset and return a list of recommended visualizations in Canvas Node format.
        """
        recommendations = []
        generated_ids = set()

        def add_recommendation(rec: Dict[str, Any]):
            if rec['canvas_node_id'] not in generated_ids:
                recommendations.append(rec)
                generated_ids.add(rec['canvas_node_id'])

        # Identify column types
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        categorical_cols = df.select_dtypes(include=['object', 'category', 'bool']).columns.tolist()
        datetime_cols = df.select_dtypes(include=['datetime', 'datetimetz']).columns.tolist()

        # Try to parse object columns as datetime if not already detected
        if not datetime_cols:
            for col in df.select_dtypes(include=['object']).columns:
                try:
                    if df[col].dropna().head(10).apply(lambda x: pd.to_datetime(x, errors='coerce') is not pd.NaT).all():
                        datetime_cols.append(col)
                        if col in categorical_cols:
                            categorical_cols.remove(col)
                except:
                    pass

        # 1. Time Series Analysis (Line Charts)
        if datetime_cols and numeric_cols:
            time_col = datetime_cols[0]
            for i, num_col in enumerate(numeric_cols[:3]):
                viz_id = f"canvas_viz_line_{time_col}_{num_col}"
                add_recommendation({
                    "canvas_node_id": viz_id,
                    "node_type": "chart",
                    "chart_type": "line",
                    "title": f"Trend of {num_col}",
                    "description": f"Shows how {num_col} changes over {time_col}.",
                    "reason": f"Time-series detected. Best for tracking {num_col} trends.",
                    "recommended": True,
                    "editable": True,
                    "data_mapping": {
                        "x": time_col,
                        "y": num_col,
                        "aggregation": "mean"
                    },
                    "canvas_props": {
                        "width": 500,
                        "height": 300,
                        "position": {"x": 20 + (i * 20), "y": 20 + (i * 20)},
                        "theme": "light"
                    },
                    "render_config": {
                        "library": "recharts",
                        "xKey": time_col,
                        "yKey": num_col,
                        "responsive": True,
                        "colorScheme": "blue"
                    }
                })

        # 2. Categorical Comparisons (Bar Charts)
        if categorical_cols and numeric_cols:
            suitable_cat_cols = [c for c in categorical_cols if df[c].nunique() < 20]
            for i, cat_col in enumerate(suitable_cat_cols[:2]):
                for j, num_col in enumerate(numeric_cols[:2]):
                    viz_id = f"canvas_viz_bar_{cat_col}_{num_col}"
                    add_recommendation({
                        "canvas_node_id": viz_id,
                        "node_type": "chart",
                        "chart_type": "bar",
                        "title": f"{num_col} by {cat_col}",
                        "description": f"Compare {num_col} across {cat_col}.",
                        "reason": f"Categorical data detected. Good for comparing groups.",
                        "recommended": True,
                        "editable": True,
                        "data_mapping": {
                            "x": cat_col,
                            "y": num_col,
                            "aggregation": "sum"
                        },
                        "canvas_props": {
                            "width": 500,
                            "height": 300,
                            "position": {"x": 50 + (i * 20), "y": 50 + (j * 20)},
                            "theme": "light"
                        },
                        "render_config": {
                            "library": "recharts",
                            "xKey": cat_col,
                            "yKey": num_col,
                            "responsive": True,
                            "colorScheme": "teal"
                        }
                    })

        # 3. Distributions (Histograms)
        for i, num_col in enumerate(numeric_cols[:3]):
            viz_id = f"canvas_viz_hist_{num_col}"
            add_recommendation({
                "canvas_node_id": viz_id,
                "node_type": "chart",
                "chart_type": "histogram",
                "title": f"Distribution of {num_col}",
                "description": f"Frequency distribution of {num_col}.",
                "reason": f"Analyze the spread/skewness of {num_col}.",
                "recommended": False,
                "editable": True,
                "data_mapping": {
                    "x": num_col,
                    "y": "count",
                    "aggregation": None
                },
                "canvas_props": {
                    "width": 500,
                    "height": 300,
                    "position": {"x": 100 + (i * 20), "y": 100},
                    "theme": "light"
                },
                "render_config": {
                    "library": "recharts",
                    "xKey": num_col,
                    "yKey": "count",
                    "responsive": True,
                    "colorScheme": "indigo"
                }
            })

        # 4. Correlation (Scatter Plots)
        if len(numeric_cols) >= 2:
            correlations = profile.get('correlations', {})
            pairs = []
            seen_pairs = set()
            for key, val in correlations.items():
                if abs(val) > 0.5 and abs(val) < 0.99:
                    parts = key.split('|')
                    if len(parts) == 2:
                        p = tuple(sorted([parts[0], parts[1].replace('_spearman', '')]))
                        if p not in seen_pairs:
                            pairs.append((p[0], p[1], val))
                            seen_pairs.add(p)
            pairs.sort(key=lambda x: abs(x[2]), reverse=True)
            
            for i, (col1, col2, corr_val) in enumerate(pairs[:3]):
                viz_id = f"canvas_viz_scatter_{col1}_{col2}"
                add_recommendation({
                    "canvas_node_id": viz_id,
                    "node_type": "chart",
                    "chart_type": "scatter",
                    "title": f"{col1} vs {col2}",
                    "description": f"Correlation: {corr_val:.2f}",
                    "reason": f"Strong correlation ({corr_val:.2f}) detected.",
                    "recommended": True,
                    "editable": True,
                    "data_mapping": {
                        "x": col1,
                        "y": col2,
                        "aggregation": None
                    },
                    "canvas_props": {
                        "width": 500,
                        "height": 400,
                        "position": {"x": 150 + (i * 20), "y": 150},
                        "theme": "light"
                    },
                    "render_config": {
                        "library": "recharts",
                        "xKey": col1,
                        "yKey": col2,
                        "responsive": True,
                        "colorScheme": "orange"
                    }
                })

            # Default scatter
            if not pairs and len(numeric_cols) >= 2:
                viz_id = f"canvas_viz_scatter_{numeric_cols[0]}_{numeric_cols[1]}"
                add_recommendation({
                    "canvas_node_id": viz_id,
                    "node_type": "chart",
                    "chart_type": "scatter",
                    "title": f"{numeric_cols[0]} vs {numeric_cols[1]}",
                    "description": "Exploratory scatter plot.",
                    "reason": "Explore relationship between variables.",
                    "recommended": False,
                    "editable": True,
                    "data_mapping": {
                        "x": numeric_cols[0],
                        "y": numeric_cols[1],
                        "aggregation": None
                    },
                     "canvas_props": {
                        "width": 500,
                        "height": 400,
                        "position": {"x": 150, "y": 150},
                        "theme": "light"
                    },
                    "render_config": {
                        "library": "recharts",
                        "xKey": numeric_cols[0],
                        "yKey": numeric_cols[1],
                        "responsive": True,
                        "colorScheme": "gray"
                    }
                })

        # 5. Proportions (Pie)
        if categorical_cols:
            for cat_col in categorical_cols:
                nunique = df[cat_col].nunique()
                if 2 <= nunique <= 5:
                    viz_id = f"canvas_viz_pie_{cat_col}"
                    add_recommendation({
                        "canvas_node_id": viz_id,
                        "node_type": "chart",
                        "chart_type": "pie",
                        "title": f"Proportion of {cat_col}",
                        "description": f"Part-to-whole breakdown.",
                        "reason": f"Low cardinality ({nunique}) category.",
                        "recommended": False,
                        "editable": True,
                        "data_mapping": {
                            "x": cat_col,
                            "y": "count",
                            "aggregation": "count"
                        },
                        "canvas_props": {
                            "width": 400,
                            "height": 300,
                            "position": {"x": 200, "y": 200},
                            "theme": "light"
                        },
                        "render_config": {
                            "library": "recharts",
                            "dataKey": "value",
                            "nameKey": "name",
                            "responsive": True,
                            "colorScheme": "colorful"
                        }
                    })
                    break

        return recommendations

    def generate_histogram_data(self, df: pd.DataFrame, column: Optional[str] = None) -> Dict[str, Any]:
        """Generate histogram data for a numeric column. If column is None, use first numeric."""
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        col = column or (numeric_cols[0] if numeric_cols else None)
        if not col or col not in df.columns:
            return {'column': None, 'values': [], 'bins': []}
        vals = df[col].dropna().tolist()
        vals = [clean_for_viz(v) for v in vals if clean_for_viz(v) is not None]
        hist, bin_edges = np.histogram(vals, bins=min(20, max(5, len(set(vals)))))
        return {
            'column': col,
            'values': [float(x) for x in hist],
            'bins': [float(x) for x in bin_edges],
            'labels': [f'{bin_edges[i]:.1f}-{bin_edges[i+1]:.1f}' for i in range(len(bin_edges)-1)],
        }

    def generate_bar_chart_data(self, df: pd.DataFrame, x_col: Optional[str] = None, y_col: Optional[str] = None) -> Dict[str, Any]:
        """Generate bar chart data: categorical x vs numeric y (aggregated)."""
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        cat_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()
        x = x_col or (cat_cols[0] if cat_cols else None)
        y = y_col or (numeric_cols[0] if numeric_cols else None)
        if not x or x not in df.columns:
            return {'column': None, 'values': [], 'labels': []}
        if y and y in df.columns:
            agg = df.groupby(x)[y].sum().reset_index()
            return {
                'column': x,
                'values': [clean_for_viz(v) for v in agg[y].tolist()],
                'labels': [str(v) for v in agg[x].tolist()],
            }
        else:
            counts = df[x].value_counts().head(20)
            return {
                'column': x,
                'values': [int(v) for v in counts.values],
                'labels': [str(v) for v in counts.index],
            }

    def generate_correlation_matrix(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Generate correlation matrix for numeric columns."""
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        if len(numeric_cols) < 2:
            return {'columns': [], 'matrix': [], 'data': []}
        corr = df[numeric_cols].corr()
        matrix = corr.values.tolist()
        matrix_clean = [[clean_for_viz(v) for v in row] for row in matrix]
        data = []
        for i, c1 in enumerate(numeric_cols):
            for j, c2 in enumerate(numeric_cols):
                if i != j:
                    data.append({'x': c1, 'y': c2, 'value': clean_for_viz(corr.iloc[i, j])})
        return {
            'columns': numeric_cols,
            'matrix': matrix_clean,
            'data': data,
        }

    def generate_numeric_summary(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Generate summary stats for all numeric columns."""
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        result = {}
        for col in numeric_cols:
            s = df[col].dropna()
            result[col] = {
                'mean': clean_for_viz(s.mean()),
                'std': clean_for_viz(s.std()),
                'min': clean_for_viz(s.min()),
                'max': clean_for_viz(s.max()),
                'median': clean_for_viz(s.median()),
                'count': int(len(s)),
            }
        return result

    def generate_all_chart_data(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Generate all visualization data for a dataset."""
        return {
            'histogram': self.generate_histogram_data(df),
            'bar_chart': self.generate_bar_chart_data(df),
            'correlation': self.generate_correlation_matrix(df),
            'numeric_summary': self.generate_numeric_summary(df),
        }


visualization_service = VisualizationService()
