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

    // Update filename display when file is selected
    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            fileNameDisplay.textContent = `Selected file: ${file.name}`;
        } else {
            fileNameDisplay.textContent = 'Drag and drop your CSV file here or click to browse';
        }
    });

    // Handle drag and drop
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

    // Handle form submission
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
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
            const response = await fetch('/api/upload-csv/', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (response.ok) {
                displayColumnSelection(result.columns);
            } else {
                showError(result.error);
            }
        } catch (error) {
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
            const response = await fetch('/api/process-columns/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ columns: selectedColumns }),
            });

            const result = await response.json();

            if (response.ok) {
                showSuccess(result);
            } else {
                showError(result.error);
            }
        } catch (error) {
            showError(error.message);
        } finally {
            loadingElement.classList.add('d-none');
        }
    });

    function showSuccess(result) {
        console.log('API Response:', result); // Debug log
        
        if (!result || !result.results) {
            showError('Invalid response format from server');
            return;
        }

        const spendingData = result.results;
        let html = '<div class="alert alert-success" role="alert">';
        html += '<h4 class="alert-heading">Spending per Category:</h4>';
        
        // Create a table to display category spending
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
        
        // Add rows for each category
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
});
