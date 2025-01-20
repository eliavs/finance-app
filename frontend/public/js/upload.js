document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('upload-form');
    const fileInput = document.getElementById('csv-file');
    const fileNameDisplay = document.getElementById('file-name');
    const loadingElement = document.getElementById('loading');
    const outputElement = document.getElementById('output');
    const columnSelection = document.getElementById('column-selection');
    const columnsList = document.getElementById('columns-list');
    const selectAllBtn = document.getElementById('select-all');
    const deselectAllBtn = document.getElementById('deselect-all');
    const processColumnsBtn = document.getElementById('process-columns');

    // Make the upload area clickable
    const uploadArea = document.querySelector('.upload-area');
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });

    // File input handling
    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            fileNameDisplay.textContent = `Selected file: ${file.name}`;
        }
    });

    // Form submission
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        console.log('Form submitted'); // Debug log

        const file = fileInput.files[0];
        if (!file) {
            showError('Please select a CSV file to upload.');
            return;
        }

        loadingElement.classList.remove('d-none');
        outputElement.innerHTML = '';
        columnSelection.classList.add('d-none');

        const formData = new FormData();
        formData.append('file', file);

        try {
            console.log('Sending request to backend...'); // Debug log
            const response = await fetch('http://localhost:8000/api/upload-csv/', {
                method: 'POST',
                body: formData,
                credentials: 'include', // Include cookies
            });

            console.log('Response received:', response); // Debug log
            const result = await response.json();

            if (response.ok) {
                console.log('Columns received:', result.columns); // Debug log
                displayColumnSelection(result.columns);
            } else {
                showError(result.error || 'Upload failed');
            }
        } catch (error) {
            console.error('Upload error:', error); // Debug log
            showError(error.message);
        } finally {
            loadingElement.classList.add('d-none');
        }
    });

    function displayColumnSelection(columns) {
        columnsList.innerHTML = columns.map(col => `
            <div class="col-md-4">
                <div class="form-check">
                    <input class="form-check-input column-checkbox" type="checkbox" value="${col}" id="col-${col}">
                    <label class="form-check-label" for="col-${col}">
                        ${col}
                    </label>
                </div>
            </div>
        `).join('');

        columnSelection.classList.remove('d-none');
    }

    // Column selection handlers
    selectAllBtn.addEventListener('click', () => {
        document.querySelectorAll('.column-checkbox').forEach(checkbox => {
            checkbox.checked = true;
        });
    });

    deselectAllBtn.addEventListener('click', () => {
        document.querySelectorAll('.column-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
    });

    processColumnsBtn.addEventListener('click', async () => {
        const selectedColumns = Array.from(document.querySelectorAll('.column-checkbox:checked'))
            .map(checkbox => checkbox.value);

        if (selectedColumns.length === 0) {
            showError('Please select at least one column.');
            return;
        }

        loadingElement.classList.remove('d-none');

        try {
            console.log('Processing columns:', selectedColumns); // Debug log
            const response = await fetch('http://localhost:8000/api/process-columns/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include', // Include cookies
                body: JSON.stringify({ columns: selectedColumns }),
            });

            const result = await response.json();
            console.log('Processing result:', result); // Debug log

            if (response.ok) {
                showSuccess(result);
            } else {
                showError(result.error || 'Processing failed');
            }
        } catch (error) {
            console.error('Processing error:', error); // Debug log
            showError(error.message);
        } finally {
            loadingElement.classList.add('d-none');
        }
    });

    function showSuccess(result) {
        console.log('Showing results:', result); // Debug log
        
        if (!result || !result.results) {
            showError('Invalid response format from server');
            return;
        }

        const spendingData = result.results;
        let html = '<div class="alert alert-success" role="alert">';
        html += '<h4 class="alert-heading">Spending per Category:</h4>';
        
        html += `
            <table class="table table-striped mt-3">
                <thead>
                    <tr>
                        <th>Category</th>
                        <th>Total Spending</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        for (const [category, amount] of Object.entries(spendingData)) {
            html += `
                <tr>
                    <td>${category}</td>
                    <td>${amount.toFixed(2)}</td>
                </tr>
            `;
        }
        
        html += `
                </tbody>
            </table>
        </div>`;
        
        outputElement.innerHTML = html;
    }

    function showError(message) {
        console.error('Error:', message); // Debug log
        outputElement.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <i class="fas fa-exclamation-circle me-2"></i>
                ${message}
            </div>
        `;
    }

    // Add drag and drop functionality
    const dropZone = document.querySelector('.file-upload-wrapper');

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    function highlight(e) {
        dropZone.classList.add('border-primary');
    }

    function unhighlight(e) {
        dropZone.classList.remove('border-primary');
    }

    dropZone.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const file = dt.files[0];
        fileInput.files = dt.files;
        if (file) {
            fileNameDisplay.textContent = `Selected file: ${file.name}`;
        }
    }

    // Show modal when "Define Categories" is clicked
    document.getElementById('define-categories').addEventListener('click', () => {
        const modal = document.getElementById('category-mapper-modal');
        const columnSelect = document.getElementById('category-column-select');
        
        // Populate column select with available columns
        columnSelect.innerHTML = '<option value="">Select a column...</option>' +
            columns.map(col => `<option value="${col}">${col}</option>`).join('');
        
        modal.style.display = 'block';
    });

    // Handle column selection
    document.getElementById('category-column-select').addEventListener('change', async (e) => {
        const column = e.target.value;
        if (!column) return;
        
        const mappingsContainer = document.getElementById('category-mappings');
        
        // Get unique values from the selected column
        const uniqueValues = [...new Set(data.map(row => row[column]))];
        
        // Create mapping interface
        mappingsContainer.innerHTML = `
            <table class="table mt-3">
                <thead>
                    <tr>
                        <th>Original Value</th>
                        <th>Category</th>
                    </tr>
                </thead>
                <tbody>
                    ${uniqueValues.map(value => `
                        <tr>
                            <td>${value}</td>
                            <td>
                                <select class="form-select category-select" data-value="${value}">
                                    <option value="">Select category...</option>
                                    <option value="Business">Business</option>
                                    <option value="Personal">Personal</option>
                                    <option value="Investment">Investment</option>
                                    <option value="Other">Other</option>
                                </select>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    });

    // Handle save categories
    document.getElementById('save-categories').addEventListener('click', async () => {
        const column = document.getElementById('category-column-select').value;
        const mappings = {};
        
        document.querySelectorAll('.category-select').forEach(select => {
            const originalValue = select.dataset.value;
            const category = select.value;
            if (category) {
                mappings[originalValue] = category;
            }
        });
        
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('column', column);
        formData.append('mappings', JSON.stringify(mappings));
        
        try {
            const response = await fetch('http://localhost:8000/api/define-categories/', {
                method: 'POST',
                body: formData,
            });
            
            if (response.ok) {
                const result = await response.blob();
                // Create download link
                const url = window.URL.createObjectURL(result);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'processed_with_categories.csv';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                
                // Close modal
                document.getElementById('category-mapper-modal').style.display = 'none';
            } else {
                showError('Failed to process categories');
            }
        } catch (error) {
            showError(error.message);
        }
    });

    // Close modal
    document.getElementById('close-modal').addEventListener('click', () => {
        document.getElementById('category-mapper-modal').style.display = 'none';
    });
});