
import lightgbm as lgb
import shap
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from django.core.files.base import ContentFile
from django.http import HttpResponse, FileResponse
from django.conf import settings
from .models import Dataset
from .serializers import DatasetSerializer
from .preprocessing_service import preprocessing_service
import pandas as pd
import numpy as np
import os
import uuid

def clean_for_json(obj):
    """
    Recursively clean dictionary/list to ensure JSON compliance.
    Handles NaN, Inf, and numpy types.
    """
    if isinstance(obj, dict):
        return {k: clean_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_for_json(v) for v in obj]
    elif isinstance(obj, (float, np.float32, np.float64)):
        return None if (np.isnan(obj) or np.isinf(obj)) else float(obj)
    elif isinstance(obj, (int, np.int32, np.int64)):
        return int(obj)
    elif pd.isna(obj):
        return None
    return obj


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

        except Exception as e:
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
                raise Exception("Unsupported file type")

            # Store 5x5 preview only for UI
            preview = df.head(5).iloc[:, :5]
            # Replace NaN/Inf with None for JSON compliance
            preview_clean = preview.astype(object).where(pd.notnull(preview), None)
            preview_clean = preview_clean.replace([float('inf'), float('-inf')], None)
            dataset.metadata['preview'] = preview_clean.to_dict(orient='records')
            dataset.metadata['rowCount'] = len(df)  # Full dataset stats
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
        
        # Path logic
        user_id = str(request.user.id)
        ds_id = str(dataset.id)
        processed_path = os.path.join(settings.MEDIA_ROOT, 'datasets', user_id, ds_id, 'processed.csv')
        
        if not os.path.exists(processed_path):
             # Fallback to metadata check if path differs?
             if dataset.metadata.get('processed_file_path') and os.path.exists(dataset.metadata['processed_file_path']):
                 processed_path = dataset.metadata['processed_file_path']
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
            df_for_model[col] = df_for_model[col].fillna(df_for_model[col].median())
        for col in categorical_features:
            df_for_model[col] = df_for_model[col].fillna(df_for_model[col].mode().iloc[0])
            df_for_model[col] = df_for_model[col].astype('category')

        target_info = profile.get('target')
        if not target_info:
            return Response(clean_for_json({'profile': profile, 'suggestions': []}))
            
        target_col = target_info.get('column')
        problem_type = target_info.get('task')

        X = df_for_model.drop(columns=[target_col])
        y = df_for_model[target_col]

        try:
             import lightgbm as lgb
             if problem_type == 'classification':
                model = lgb.LGBMClassifier(random_state=42)
                y = pd.Series(pd.factorize(y)[0])
             elif problem_type == 'regression':
                model = lgb.LGBMRegressor(random_state=42)
             else:
                model = None
             
             if model:
                 model.fit(X, y, categorical_feature=categorical_features)
                 feature_importances = model.feature_importances_
                 feature_names = X.columns
                 importance_df = pd.DataFrame({'feature': feature_names, 'importance': feature_importances}).sort_values(by='importance', ascending=False)
                 # Add feature importance to profile
                 profile['featureImportance'] = importance_df.head(20).to_dict(orient='records')
        except ImportError:
             logging.warning("LightGBM not installed. Skipping feature importance.")
        except Exception as e:
             logging.error(f"LightGBM failed: {e}")

        
        # robustly generate suggestions
        try:
             # Generate Feature Engineering suggestions (Enhanced + ML + Basic)
             fe_suggestions = preprocessing_service.generate_feature_engineering_suggestions(df, profile)
        except Exception as suggestion_error:
             logging.error(f"Error generating FE suggestions: {suggestion_error}")
             fe_suggestions = []

        try:
             # Generate Cleaning/Preprocessing suggestions
             clean_suggestions = preprocessing_service.generate_preprocessing_suggestions(df, profile)
        except Exception as clean_error:
             logging.error(f"Error generating cleaning suggestions: {clean_error}")
             clean_suggestions = []
        
        # Combine all suggestions
        all_suggestions = clean_suggestions + fe_suggestions

        # Apply robust JSON cleaning before response
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
