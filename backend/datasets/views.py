from rest_framework import viewsets, status
from rest_framework.response import Response
<<<<<<< Updated upstream
from rest_framework.permissions import IsAuthenticated
from .models import Dataset
from .serializers import DatasetSerializer
=======
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.core.files.base import ContentFile
from django.http import HttpResponse, FileResponse
from django.conf import settings
from .models import Dataset, Visualization
from .serializers import DatasetSerializer, VisualizationSerializer
from .preprocessing_service import preprocessing_service
from .visualization_service import visualization_service
import pandas as pd
import numpy as np
import os
import logging
import traceback

def clean_for_json(obj):
    if isinstance(obj, dict):
        return {k: clean_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_for_json(i) for i in obj]
    elif isinstance(obj, float):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return obj
    elif pd.isna(obj):
        return None
    return obj

>>>>>>> Stashed changes
import pandas as pd


class JsonUploadView(APIView):
    """Upload dataset from JSON data - stores FULL dataset"""
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        file_name = request.data.get('name')
        data = request.data.get('data')

        if not file_name or not data:
            return Response({'error': 'File name and data are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Create DataFrame from ALL rows (full dataset)
            df = pd.DataFrame(data)
            csv_buffer = df.to_csv(index=False)
            
            # Store FULL dataset in backend
            dataset = Dataset(user=request.user, name=file_name, metadata={})
            dataset.file.save(file_name, ContentFile(csv_buffer.encode('utf-8')))
            
            # Create 5x5 preview ONLY for frontend display
            preview = df.head(5).iloc[:, :5]
            # Replace NaN/Inf with None for JSON compliance
            preview_clean = preview.astype(object).where(pd.notnull(preview), None)
            preview_clean = preview_clean.replace([float('inf'), float('-inf')], None)
            dataset.metadata['preview'] = preview_clean.to_dict(orient='records')
            dataset.metadata['rowCount'] = len(df)  # Full dataset row count
            dataset.metadata['columnCount'] = len(df.columns)  # Full dataset column count
            dataset.save()

            return Response({
                'fileId': dataset.id,
                'preview': {
                    'columns': list(preview.columns),
                    'rows': preview_clean.to_dict(orient='records')
                }
            }, status=status.HTTP_201_CREATED)

<<<<<<< Updated upstream
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
=======
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_dataset(request):
    """
    POST /api/datasets/upload/
    Accept file uploads (CSV, JSON, XLSX). Save to media/datasets/, store metadata.
    """
    uploaded_file = request.FILES.get('file')
    if not uploaded_file:
        return Response({'error': 'No file provided. Use "file" key in FormData.'}, status=status.HTTP_400_BAD_REQUEST)

    file_ext = uploaded_file.name.split('.')[-1].lower()
    if file_ext not in ['csv', 'json', 'xlsx', 'xls']:
        return Response({'error': 'Unsupported format. Use CSV, JSON, or XLSX.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        dataset = Dataset(user=request.user, name=request.data.get('name', uploaded_file.name), metadata={})
        dataset.file.save(uploaded_file.name, uploaded_file, save=True)

        # Parse and extract metadata
        file_path = dataset.file.path
        if file_ext == 'csv':
            df = pd.read_csv(file_path)
        elif file_ext in ['xlsx', 'xls']:
            df = pd.read_excel(file_path)
        else:
            df = pd.read_json(file_path)

        dataset.rows = len(df)
        dataset.columns = list(df.columns)
        preview = df.head(5).iloc[:, :5]
        preview_clean = preview.astype(object).where(pd.notnull(preview), None)
        preview_clean = preview_clean.replace([float('inf'), float('-inf')], None)
        dataset.metadata['preview'] = preview_clean.to_dict(orient='records')
        dataset.metadata['rowCount'] = len(df)
        dataset.metadata['columnCount'] = len(df.columns)
        dataset.save()

        return Response({
            'id': str(dataset.id),
            'dataset_id': dataset.id,
            'rows': dataset.rows,
            'columns': dataset.columns,
            'metadata': dataset.metadata,
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        logging.error(f"Upload failed: {e}")
        traceback.print_exc()
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UploadViewSet(viewsets.ModelViewSet):
    """Upload dataset from file - stores FULL dataset"""
    queryset = Dataset.objects.all()
    serializer_class = DatasetSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        dataset = serializer.save(user=self.request.user)
        try:
            file = dataset.file
            file_extension = file.name.split('.')[-1].lower()
            
            # Read FULL dataset
            if file_extension == 'csv':
                df = pd.read_csv(file)
            elif file_extension in ['xlsx', 'xls']:
                df = pd.read_excel(file)
            elif file_extension == 'json':
                df = pd.read_json(file)
            else:
                raise Exception("Unsupported file type. Use CSV, JSON, or XLSX.")

            # Store metadata: rows, columns, preview
            dataset.rows = len(df)
            dataset.columns = list(df.columns)
            preview = df.head(5).iloc[:, :5]
            preview_clean = preview.astype(object).where(pd.notnull(preview), None)
            preview_clean = preview_clean.replace([float('inf'), float('-inf')], None)
            dataset.metadata['preview'] = preview_clean.to_dict(orient='records')
            dataset.metadata['rowCount'] = len(df)
            dataset.metadata['columnCount'] = len(df.columns)
            dataset.save()
        except Exception as e:
            dataset.delete()
            raise e

    def get_queryset(self):
        return Dataset.objects.filter(user=self.request.user)



import logging


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_data_preview(request):
    """Get limited preview of dataset (5 rows by default)"""
    file_id = request.query_params.get('fileId')
    limit = int(request.query_params.get('limit', 10))
    
    logging.info(f"get_data_preview called with fileId: {file_id}")

    if not file_id:
        return Response({'error': 'fileId is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Verify dataset exists and belongs to user
        try:
            dataset = Dataset.objects.get(id=file_id, user=request.user)
            logging.info(f"Dataset found: {dataset.name}")

            if not dataset.file:
                logging.error(f"Dataset {file_id} has no file associated with it.")
                return Response({'success': False, 'error': 'No file associated with this dataset.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            file_path = dataset.file.path
            logging.info(f"Dataset file path: {file_path}")
            
            if not os.path.exists(file_path):
                logging.error(f"File not found at path: {file_path}")
                return Response({'success': False, 'error': f'File not found at path: {file_path}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            logging.info(f"File exists at path: {os.path.exists(file_path)}")

        except Dataset.DoesNotExist:
            logging.error(f"Dataset with id {file_id} not found for user {request.user}")
            return Response({
                'success': False,
                'error': f'Dataset {file_id} not found or access denied'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Load dataset
        try:
            df = preprocessing_service.load_dataset(file_path)
        except Exception as e:
            import traceback
            traceback.print_exc()
            logging.error(f"Failed to load dataset {file_id}: {e}")
            return Response({
                'success': False,
                'error': f'Failed to load dataset: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Return limited preview
        preview_df = df.head(limit)
        
        try:
            # Robustly handle NaN/Inf for JSON
            preview_clean = preview_df.astype(object).where(pd.notnull(preview_df), None)
            preview_clean = preview_clean.replace([float('inf'), float('-inf')], None)
            preview_dict = preview_clean.to_dict(orient='records')
        except Exception as e:
            import traceback
            traceback.print_exc()
            logging.error(f"Failed to generate preview for {file_id}: {e}")
            return Response({
                'success': False,
                'error': f'Failed to generate preview: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({
            'success': True,
            'data': {
                'columns': list(df.columns),
                'rows': preview_dict,
                'rowCount': len(df),
                'columnTypes': {col: str(df[col].dtype) for col in df.columns}
            }
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        logging.error(f"Unhandled error in get_data_preview for {file_id}: {e}")
        return Response({
            'success': False,
            'error': f'Internal error: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



@api_view(['POST'])
@permission_classes([IsAuthenticated])
def get_data_profile(request):
    """Profile the FULL dataset - returns statistics on complete data"""
    file_id = request.data.get('fileId')
    
    if not file_id:
        return Response({'error': 'fileId is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        dataset = Dataset.objects.get(id=file_id, user=request.user)
        # Load FULL dataset for profiling
        df = preprocessing_service.load_dataset(dataset.file.path)
        
        # Profile the FULL dataset
        profile = preprocessing_service.profile_dataset(df)
        
        return Response({
            'success': True,
            'data': profile
        })
    except Dataset.DoesNotExist:
        return Response({'error': 'Dataset not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def get_preprocessing_suggestions(request):
    """Get AI-driven preprocessing suggestions based on FULL dataset analysis"""
    file_id = request.data.get('fileId')
    
    if not file_id:
        return Response({'error': 'fileId is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        dataset = Dataset.objects.get(id=file_id, user=request.user)
        # Load FULL dataset
        df = preprocessing_service.load_dataset(dataset.file.path)
        
        # Profile FULL dataset
        profile = preprocessing_service.profile_dataset(df)
        
        # Generate suggestions based on FULL dataset
        suggestions = preprocessing_service.generate_preprocessing_suggestions(df, profile)
        
        return Response({
            'success': True,
            'data': suggestions
        })
    except Dataset.DoesNotExist:
        return Response({'error': 'Dataset not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def get_feature_engineering_suggestions(request):
    """Get AI-driven feature engineering suggestions"""
    file_id = request.data.get('fileId')
    
    if not file_id:
        return Response({'error': 'fileId is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        dataset = Dataset.objects.get(id=file_id, user=request.user)
        # Load FULL dataset
        df = preprocessing_service.load_dataset(dataset.file.path)
        
        # Profile FULL dataset
        profile = preprocessing_service.profile_dataset(df)
        
        # Generate suggestions
        suggestions = preprocessing_service.generate_feature_engineering_suggestions(df, profile)
        
        return Response({
            'success': True,
            'data': suggestions
        })
    except Dataset.DoesNotExist:
        return Response({'error': 'Dataset not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def preprocess_dataset(request, dataset_id):
    """
    POST /api/datasets/preprocess/<dataset_id>/
    Run full preprocessing pipeline, save processed file, update model.
    """
    try:
        dataset = Dataset.objects.get(id=dataset_id, user=request.user)
    except Dataset.DoesNotExist:
        return Response({'error': 'Dataset not found'}, status=status.HTTP_404_NOT_FOUND)

    if not dataset.file:
        return Response({'error': 'No file associated with this dataset'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        file_path = dataset.file.path
        if not os.path.exists(file_path):
            return Response({'error': 'Dataset file not found on disk'}, status=status.HTTP_404_NOT_FOUND)

        df_processed, summary = preprocessing_service.run_full_preprocessing(file_path)

        # Save to media/datasets/processed/
        processed_filename = f"processed_{dataset.name}.csv"
        if not processed_filename.endswith('.csv'):
            processed_filename += '.csv'
        csv_buffer = df_processed.to_csv(index=False)
        dataset.processed_file.save(processed_filename, ContentFile(csv_buffer.encode('utf-8')), save=False)

        dataset.rows = len(df_processed)
        dataset.columns = list(df_processed.columns)
        dataset.preprocessing_applied = True
        dataset.metadata.update({
            'processed': True,
            'processed_file_path': dataset.processed_file.path if dataset.processed_file else None,
            'last_processed_at': str(pd.Timestamp.now()),
            'preprocess_summary': summary,
        })
        dataset.save()

        return Response({
            'dataset_id': dataset.id,
            'rows': dataset.rows,
            'columns': dataset.columns,
            'preprocessing_applied': True,
            'summary': summary,
        }, status=status.HTTP_200_OK)
    except Exception as e:
        logging.error(f"Preprocessing failed: {e}")
        traceback.print_exc()
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def apply_preprocessing(request, dataset_id=None):
    """Apply preprocessing steps and save to specific path"""
    # handle both url param and body param for legacy support if needed
    file_id = dataset_id or request.data.get('fileId')
    steps = request.data.get('steps', [])
    
    if not file_id:
        return Response({'error': 'fileId is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        dataset = Dataset.objects.get(id=file_id, user=request.user)
        # Load FULL dataset
        df = preprocessing_service.load_dataset(dataset.file.path)
        
        # Apply preprocessing
        df_processed, summary = preprocessing_service.apply_preprocessing(df, steps)
        
        # Define storage path
        user_id = str(request.user.id)
        ds_id = str(dataset.id)
        
        # Ensure directory exists: media/datasets/{user_id}/{dataset_id}/
        save_dir = os.path.join(settings.MEDIA_ROOT, 'datasets', user_id, ds_id)
        os.makedirs(save_dir, exist_ok=True)
        
        processed_path = os.path.join(save_dir, 'processed.csv')
        
        # Save processed dataset
        df_processed.to_csv(processed_path, index=False)
        
        # Update metadata
        dataset.metadata.update({
            'processed': True,
            'processed_file_path': processed_path,
            'last_processed_at': str(pd.Timestamp.now()),
            'idpra_summary': summary
        })
        dataset.save()

        # Create 5x5 preview
        preview = df_processed.head(5).iloc[:, :min(5, len(df_processed.columns))]
        preview_clean = preview.astype(object).where(pd.notnull(preview), None)
        preview_clean = preview_clean.replace([float('inf'), float('-inf')], None)
        
        return Response({
            'success': True,
            'data': {
                'processedFileId': dataset.id, # Return same ID as we are updating in place (conceptually)
                'summary': summary['summary'],
                'beforeShape': summary['beforeShape'],
                'afterShape': summary['afterShape'],
                'appliedSteps': summary['appliedSteps'],
                'removedFeatures': summary.get('removedFeatures', []),
                'engineeredFeatures': summary.get('engineeredFeatures', []),
                'preview': {
                    'columns': list(preview.columns),
                    'rows': preview_clean.to_dict(orient='records')
                }
            }
        })
    except Dataset.DoesNotExist:
        return Response({'error': 'Dataset not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_preprocessed_data(request, dataset_id=None):
    """Download the processed dataset from specific path"""
    file_id = dataset_id or request.query_params.get('fileId')
    
    if not file_id:
        return Response({'error': 'fileId is required'}, status=status.HTTP_400_BAD_REQUEST)
        
    try:
        # Check permission
        dataset = Dataset.objects.get(id=file_id, user=request.user)
        
        # Prefer processed_file field, then metadata path, then legacy path
        processed_path = None
        if dataset.processed_file:
            try:
                processed_path = dataset.processed_file.path
            except (ValueError, AttributeError):
                pass
        if not processed_path or not os.path.exists(processed_path):
            user_id = str(request.user.id)
            ds_id = str(dataset.id)
            processed_path = os.path.join(settings.MEDIA_ROOT, 'datasets', user_id, ds_id, 'processed.csv')
        if not processed_path or not os.path.exists(processed_path):
            if dataset.metadata.get('processed_file_path') and os.path.exists(dataset.metadata['processed_file_path']):
                processed_path = dataset.metadata['processed_file_path']
            else:
                # Fallback: serve original file if no processed version
                if dataset.file and os.path.exists(dataset.file.path):
                    processed_path = dataset.file.path
                else:
                    return Response({'error': 'Processed dataset not found. Please run preprocessing first.'}, status=status.HTTP_404_NOT_FOUND)

        # Serve file
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="processed_{dataset.name}.csv"'
        
        with open(processed_path, 'rb') as f:
            response.write(f.read())
        return response

    except Dataset.DoesNotExist:
        return Response({'error': 'Dataset not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)




@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profile_and_suggest_features(request, dataset_id):
    """
    Profile the dataset and suggest features using a LightGBM model.
    """
    logging.info(f"profile_and_suggest_features called with dataset_id: {dataset_id}")
    try:
        dataset = Dataset.objects.get(id=dataset_id, user=request.user)
        logging.info(f"Dataset found: {dataset.name}")

        if not dataset.file:
            logging.error(f"Dataset {dataset_id} has no file associated with it.")
            return Response({'success': False, 'error': 'No file associated with this dataset.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        file_path = dataset.file.path
        logging.info(f"Dataset file path: {file_path}")

        if not os.path.exists(file_path):
            logging.error(f"File not found at path: {file_path}")
            return Response({'success': False, 'error': f'File not found at path: {file_path}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    except Dataset.DoesNotExist:
        logging.error(f"Dataset with id {dataset_id} not found for user {request.user}")
        return Response({'error': 'Dataset not found or access denied'}, status=status.HTTP_404_NOT_FOUND)

    try:
        df = preprocessing_service.load_dataset(file_path)
        
        profile = preprocessing_service.profile_dataset(df)
        
        df_for_model = df.copy()
        
        categorical_features = [col for col, dtype in profile['columnTypes'].items() if dtype == 'object' or dtype == 'category']
        numerical_features = [col for col, dtype in profile['columnTypes'].items() if dtype in ['int64', 'float64']]

        for col in numerical_features:
            median_val = df_for_model[col].median()
            if pd.isna(median_val):
                 median_val = 0
            df_for_model[col] = df_for_model[col].fillna(median_val)
            
        for col in categorical_features:
            modes = df_for_model[col].mode()
            if not modes.empty:
                df_for_model[col] = df_for_model[col].fillna(modes.iloc[0])
            else:
                df_for_model[col] = df_for_model[col].fillna("Unknown")
            df_for_model[col] = df_for_model[col].astype('category')

        target_info = profile.get('target')
            
        target_col = target_info.get('column') if target_info else None
        problem_type = target_info.get('task') if target_info else None

        if target_col and target_col in df_for_model.columns:
            X = df_for_model.drop(columns=[target_col])
            y = df_for_model[target_col]

            try:
                 import lightgbm as lgb
                 model = None
                 if problem_type == 'classification':
                    model = lgb.LGBMClassifier(random_state=42)
                    y = pd.Series(pd.factorize(y)[0])
                 elif problem_type == 'regression':
                    model = lgb.LGBMRegressor(random_state=42)
                 
                 if model:
                     model.fit(X, y, categorical_feature=categorical_features)
                     feature_importances = model.feature_importances_
                     feature_names = X.columns
                     importance_df = pd.DataFrame({'feature': feature_names, 'importance': feature_importances}).sort_values(by='importance', ascending=False)
                     profile['featureImportance'] = importance_df.head(20).to_dict(orient='records')
            except ImportError:
                 logging.warning("LightGBM not installed. Skipping feature importance.")
            except Exception as e:
                 logging.error(f"LightGBM failed: {e}")

        # robustly generate suggestions
        try:
             fe_suggestions = preprocessing_service.generate_feature_engineering_suggestions(df, profile)
        except Exception as suggestion_error:
             logging.error(f"Error generating FE suggestions: {suggestion_error}")
             fe_suggestions = []

        try:
             clean_suggestions = preprocessing_service.generate_preprocessing_suggestions(df, profile)
        except Exception as clean_error:
             logging.error(f"Error generating cleaning suggestions: {clean_error}")
             clean_suggestions = []
        
        all_suggestions = clean_suggestions + fe_suggestions

        return Response(clean_for_json({
            'profile': profile,
            'suggestions': all_suggestions
        }))

    except Exception as e:
        import traceback
        logging.error(f"Generate suggestions failed: {str(e)}\n{traceback.format_exc()}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def auto_process_dataset(request):
    """
    IDPRA Automated Workflow:
    1. Scan & Profile Full Dataset
    2. Generate Recommendations (Cleaning, Encoding, Feature Engineering, Unsupervised)
    3. Auto-Apply 'Recommended' Steps
    4. Save & Return Result
    """
    dataset_id = request.data.get('dataset_id') or request.data.get('fileId')
    
    if not dataset_id:
        return Response({'error': 'dataset_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
    logging.info(f"IDPRA Auto-Process called for dataset: {dataset_id}")
    
    try:
        dataset = Dataset.objects.get(id=dataset_id, user=request.user)
        
        # 1. Load FULL Dataset
        df = preprocessing_service.load_dataset(dataset.file.path)
        
        # 2. Profile
        profile = preprocessing_service.profile_dataset(df)
        
        # 3. Generate Suggestions
        clean_suggestions = preprocessing_service.generate_preprocessing_suggestions(df, profile)
        fe_suggestions = preprocessing_service.generate_feature_engineering_suggestions(df, profile)
        
        all_suggestions = clean_suggestions + fe_suggestions
        
        # 4. Filter for Auto-Application (Only Recommended=True)
        # We also strictly enforce "Do not delete rows blindly" -> So we might skip outlier removal unless very confident
        # The service defaults outlier removal to Recommended=False, so this is handled.
        
        steps_to_apply = [s for s in all_suggestions if s.get('recommended', False)]
        
        # 5. Apply Steps
        df_processed, summary = preprocessing_service.apply_preprocessing(df, steps_to_apply)
        
        # 6. Save Processed Dataset
        processed_name = f"IDPRA_Processed_{dataset.name}"
        processed_dataset = Dataset(user=request.user, name=processed_name, metadata={})
        
        csv_buffer = df_processed.to_csv(index=False)
        processed_dataset.file.save(processed_name, ContentFile(csv_buffer.encode('utf-8')))
        
        # Create Preview
        preview = df_processed.head(5).iloc[:, :min(5, len(df_processed.columns))]
        preview_clean = preview.astype(object).where(pd.notnull(preview), None)
        preview_clean = preview_clean.replace([float('inf'), float('-inf')], None)
        
        processed_dataset.metadata = {
            'preview': preview_clean.to_dict(orient='records'),
            'rowCount': len(df_processed),
            'columnCount': len(df_processed.columns),
            'preprocessingApplied': True,
            'originalFileId': dataset_id,
            'idpra_summary': summary
        }
        processed_dataset.save()
        
        return Response({
            'success': True,
            'data': {
                'processedFileId': processed_dataset.id,
                'summary': summary['summary'],
                'beforeShape': summary['beforeShape'],
                'afterShape': summary['afterShape'],
                'appliedSteps': summary['appliedSteps'], # This serves as the "Explainability" log
                'newFeatures': summary.get('engineeredFeatures', []),
                'preview': {
                    'columns': list(preview.columns),
                    'rows': preview_clean.to_dict(orient='records')
                }
            }
        })

    except Dataset.DoesNotExist:
        return Response({'error': 'Dataset not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def visualize_dataset(request, dataset_id):
    """
    GET /api/datasets/visualize/<dataset_id>/
    Return chart data: histogram, bar_chart, correlation for frontend rendering.
    """
    try:
        dataset = Dataset.objects.get(id=dataset_id, user=request.user)
    except Dataset.DoesNotExist:
        return Response({'error': 'Dataset not found'}, status=status.HTTP_404_NOT_FOUND)

    # Prefer processed file if available
    file_path = None
    if dataset.preprocessing_applied and dataset.processed_file:
        try:
            file_path = dataset.processed_file.path
            if os.path.exists(file_path):
                pass
            else:
                file_path = None
        except (ValueError, AttributeError):
            file_path = None

    if not file_path and dataset.file:
        file_path = dataset.file.path

    if not file_path or not os.path.exists(file_path):
        return Response({'error': 'Dataset file not found'}, status=status.HTTP_404_NOT_FOUND)

    try:
        df = preprocessing_service.load_dataset(file_path)
        chart_data = visualization_service.generate_all_chart_data(df)
        return Response(chart_data, status=status.HTTP_200_OK)
    except Exception as e:
        logging.error(f"Visualization failed: {e}")
        traceback.print_exc()
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def get_visualization_suggestions(request):
    """
    Generate AI-driven visualization recommendations based on FULL preprocessed dataset.
    """
    file_id = request.data.get('fileId')
    
    if not file_id:
        return Response({'error': 'fileId is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        dataset = Dataset.objects.get(id=file_id, user=request.user)
        
        # Check if there is a processed version
        processed_path = None
        if dataset.metadata.get('processed_file_path') and os.path.exists(dataset.metadata['processed_file_path']):
            processed_path = dataset.metadata['processed_file_path']
        else:
             # Fallback to logic in download_preprocessed_data
             user_id = str(request.user.id)
             ds_id = str(dataset.id)
             potential_path = os.path.join(settings.MEDIA_ROOT, 'datasets', user_id, ds_id, 'processed.csv')
             if os.path.exists(potential_path):
                 processed_path = potential_path
             else:
                 # If not found, use the original file as fallback (but prefer processed)
                 processed_path = dataset.file.path
        
        # Load dataset
        df = preprocessing_service.load_dataset(processed_path)
        
        # Profile
        profile = preprocessing_service.profile_dataset(df)
        
        # Recommend
        recommendations = visualization_service.generate_recommendations(df, profile)
        
        return Response({
            'success': True,
            'data': recommendations
        })
        
    except Dataset.DoesNotExist:
        return Response({'error': 'Dataset not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        import traceback
        logging.error(f"Visualization error: {e}")
        traceback.print_exc()
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_visualization(request):
    """Save a user created or AI recommended visualization"""
    try:
        dataset_id = request.data.get('dataset_id')
        title = request.data.get('title')
        chart_type = request.data.get('chart_type')
        config = request.data.get('config')
        is_ai = request.data.get('is_ai_recommended', False)
        
        dataset = Dataset.objects.get(id=dataset_id, user=request.user)
        
        viz = Visualization.objects.create(
            user=request.user,
            dataset=dataset,
            title=title,
            chart_type=chart_type,
            config=config,
            is_ai_recommended=is_ai
        )
        
        return Response({
            'success': True,
            'data': VisualizationSerializer(viz).data
        })
    except Dataset.DoesNotExist:
        return Response({'error': 'Dataset not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_saved_visualizations(request, dataset_id):
    """Get all saved visualizations for a dataset"""
    try:
        dataset = Dataset.objects.get(id=dataset_id, user=request.user)
        visualizations = Visualization.objects.filter(dataset=dataset).order_by('-created_at')
        
        return Response({
            'success': True,
            'data': VisualizationSerializer(visualizations, many=True).data
        })
    except Dataset.DoesNotExist:
        return Response({'error': 'Dataset not found'}, status=status.HTTP_404_NOT_FOUND)

>>>>>>> Stashed changes
