document.addEventListener('DOMContentLoaded', () => {
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadOverlay = document.getElementById('uploadOverlay');
    const closeBtn = document.getElementById('closeBtn');
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('fileInput');
    const progress = document.getElementById('progress');
    const progressBar = document.getElementById('progressBar');

    uploadBtn.addEventListener('click', () => {
        uploadOverlay.style.display = 'flex';
    });

    closeBtn.addEventListener('click', () => {
        uploadOverlay.style.display = 'none';
        progress.style.display = 'none';
        progressBar.style.width = '0%';
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && uploadOverlay.style.display === 'flex') {
            uploadOverlay.style.display = 'none';
            progress.style.display = 'none';
            progressBar.style.width = '0%';
        }
    });

    dropArea.addEventListener('click', () => {
        fileInput.click();
    });

    dropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropArea.classList.add('dragover');
    });

    dropArea.addEventListener('dragleave', () => {
        dropArea.classList.remove('dragover');
    });

    dropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dropArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        uploadFiles(files);
    });

    fileInput.addEventListener('change', () => {
        const files = fileInput.files;
        uploadFiles(files);
    });

    function uploadFiles(files) {
        if (files.length === 0) return;
        const formData = new FormData();
        for (let file of files) {
            formData.append('files', file);
        }
        const xhr = new XMLHttpRequest();
        xhr.open('POST', window.location.pathname);
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percent = (e.loaded / e.total) * 100;
                progress.style.display = 'block';
                progressBar.style.width = percent + '%';
            }
        });
        xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
                // Clear file input after successful upload
                fileInput.value = '';
                location.reload();
            } else {
                alert('Upload failed');
            }
        });

        xhr.send(formData);
    }
});
