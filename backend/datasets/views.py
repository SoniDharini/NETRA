
import lightgbm as lgb
import shap
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from django.core.files.base import ContentFile
from django.http import HttpResponse, FileResponse
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
def apply_preprocessing(request):
    """Apply preprocessing steps to the FULL dataset"""
    file_id = request.data.get('fileId')
    steps = request.data.get('steps', [])
    
    if not file_id:
        return Response({'error': 'fileId is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        dataset = Dataset.objects.get(id=file_id, user=request.user)
        # Load FULL dataset for preprocessing
        df = preprocessing_service.load_dataset(dataset.file.path)
        
        # Apply preprocessing to FULL dataset
        df_processed, summary = preprocessing_service.apply_preprocessing(df, steps)
        
        # Save processed FULL dataset
        processed_name = f"processed_{uuid.uuid4().hex[:8]}_{dataset.name}"
        processed_dataset = Dataset(user=request.user, name=processed_name, metadata={})
        
        # Save the FULL processed dataset
        csv_buffer = df_processed.to_csv(index=False)
        processed_dataset.file.save(processed_name, ContentFile(csv_buffer.encode('utf-8')))
        
        # Create 5x5 preview for UI
        preview = df_processed.head(5).iloc[:, :min(5, len(df_processed.columns))]
        # Replace NaN/Inf with None for JSON compliance
        preview_clean = preview.astype(object).where(pd.notnull(preview), None)
        preview_clean = preview_clean.replace([float('inf'), float('-inf')], None)
        processed_dataset.metadata = {
            'preview': preview_clean.to_dict(orient='records'),
            'rowCount': len(df_processed),
            'columnCount': len(df_processed.columns),
            'preprocessingApplied': True,
            'originalFileId': file_id
        }
        processed_dataset.save()
        
        return Response({
            'success': True,
            'data': {
                'processedFileId': processed_dataset.id,
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
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_preprocessed_data(request):
    """Download the FULL preprocessed dataset"""
    file_id = request.query_params.get('fileId')
    file_format = request.query_params.get('format', 'csv')
    
    if not file_id:
        return Response({'error': 'fileId is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        dataset = Dataset.objects.get(id=file_id, user=request.user)
        # Load FULL dataset
        df = preprocessing_service.load_dataset(dataset.file.path)
        
        # Create temporary file for download
        if file_format == 'csv':
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="{dataset.name}"'
            df.to_csv(response, index=False)
        elif file_format == 'xlsx':
            response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            response['Content-Disposition'] = f'attachment; filename="{dataset.name.rsplit(".", 1)[0]}.xlsx"'
            df.to_excel(response, index=False, engine='openpyxl')
        else:
            return Response({'error': 'Unsupported format'}, status=status.HTTP_400_BAD_REQUEST)
        
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

        if problem_type == 'classification':
            model = lgb.LGBMClassifier(random_state=42)
            y = pd.Series(pd.factorize(y)[0])
        elif problem_type == 'regression':
            model = lgb.LGBMRegressor(random_state=42)
        else:
            return Response(clean_for_json({'profile': profile, 'suggestions': []}))
        
        model.fit(X, y, categorical_feature=categorical_features)

        feature_importances = model.feature_importances_
        feature_names = X.columns
        importance_df = pd.DataFrame({'feature': feature_names, 'importance': feature_importances}).sort_values(by='importance', ascending=False)
        
        # Add feature importance to profile
        profile['featureImportance'] = importance_df.head(20).to_dict(orient='records')
        
        # robustly generate suggestions
        try:
             suggestions = preprocessing_service.generate_feature_engineering_suggestions(df, profile)
        except Exception as suggestion_error:
             logging.error(f"Error generating suggestions: {suggestion_error}")
             suggestions = []

        # Apply robust JSON cleaning before response
        return Response(clean_for_json({
            'profile': profile,
            'suggestions': suggestions
        }))

    except Exception as e:
        import traceback
        traceback.print_exc()
        logging.error(f"Unhandled error in profile_and_suggest_features for {dataset_id}: {e}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

