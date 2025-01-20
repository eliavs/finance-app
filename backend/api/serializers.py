from rest_framework import serializers

class ItemSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField(max_length=100)



class CSVUploadSerializer(serializers.Serializer):
    file = serializers.FileField()

    def validate_file(self, value):
        """Custom validation for the uploaded file."""
        from .utils import validate_csv_file
        validate_csv_file(value)
        return value
    

class ColumnProcessSerializer(serializers.Serializer):
    columns = serializers.ListField(
        child=serializers.CharField(),
        min_length=1,
        error_messages={
            'min_length': 'Please select at least one column.'
        }
    )