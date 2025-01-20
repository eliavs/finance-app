from django.urls import path
from .views import ItemList, UploadCSVView, upload_page, ProcessColumnsView


urlpatterns = [
    path('items/', ItemList.as_view(), name='item-list'),
    path('upload-csv/', UploadCSVView.as_view(), name='upload-csv'),  # New endpoint
    path('process-columns/', ProcessColumnsView.as_view(), name='process-columns'),
    path('', upload_page, name='upload-page'),

]