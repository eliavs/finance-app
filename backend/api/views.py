from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import CSVUploadSerializer, ColumnProcessSerializer
from .utils import get_csv_columns, process_csv_columns
import json

# Sample in-memory data
items = [
    {"id": 1, "name": "Item 1"},
    {"id": 2, "name": "Item 2"},
]

class ItemList(APIView):
    def get(self, request):
        return Response(items)



class UploadCSVView(APIView):
    def post(self, request):
        serializer = CSVUploadSerializer(data=request.data)
        if serializer.is_valid():
            file = serializer.validated_data['file']
            try:
                # Extract column names
                columns, json_data = get_csv_columns(file)
                request.session['uploaded_csv_data'] = json_data
                return Response({
                    "message": "CSV file processed successfully.",
                    "columns": columns
                }, status=status.HTTP_200_OK)
            except Exception as e:
                return Response({
                    "error": str(e)
                }, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    


def upload_page(request):
    """Serve the CSV upload page."""
    return render(request, 'index.html')



class ProcessColumnsView(APIView):
    def post(self, request):
        serializer = ColumnProcessSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        columns = serializer.validated_data['columns']
        session_file = request.session.get('uploaded_csv_data')
        
        if not session_file:
            return Response({
                "error": "No CSV file found. Please upload a file first."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            analysis_results = process_csv_columns(session_file, columns)
            return Response({
                "message": "Columns processed successfully",
                "results": analysis_results
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                "error": f"Error processing columns: {str(e)}"
            }, status=status.HTTP_400_BAD_REQUEST)