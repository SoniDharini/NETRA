from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import RegisterSerializer, UserSerializer
from django.contrib.auth import authenticate

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            # Get the first error string nicely
            errors = serializer.errors
            error_msg = "Registration failed."
            
            for field, messages in errors.items():
                if isinstance(messages, list) and len(messages) > 0:
                    msg = str(messages[0])
                    if 'already exists' in msg.lower() or 'unique' in msg.lower():
                        error_msg = 'User already exists'
                    else:
                        error_msg = msg
                    break
                elif isinstance(messages, str):
                    msg = messages
                    if 'already exists' in msg.lower() or 'unique' in msg.lower():
                        error_msg = 'User already exists'
                    else:
                        error_msg = msg
                    break
            
            if "error" in errors:
                if isinstance(errors["error"], list) and len(errors["error"]) > 0:
                    error_msg = str(errors["error"][0])
            
            return Response({'error': error_msg}, status=status.HTTP_400_BAD_REQUEST)
            
        user = serializer.save()
        return Response({
            'user': UserSerializer(user).data,
            'message': 'User created successfully.'
        }, status=status.HTTP_201_CREATED)


class LoginView(generics.GenericAPIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request, *args, **kwargs):
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response({'error': 'Empty fields are not allowed.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if user actually exists before authenticating to separate "User not found" from "Incorrect password"
        if not User.objects.filter(username=username).exists():
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        user = authenticate(username=username, password=password)
        if user:
            refresh = RefreshToken.for_user(user)
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': UserSerializer(user).data
            })
        
        return Response({'error': 'Incorrect password'}, status=status.HTTP_401_UNAUTHORIZED)


class ProfileView(generics.RetrieveAPIView):
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user
