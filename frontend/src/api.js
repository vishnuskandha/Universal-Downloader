import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
});

export const analyzeUrl = async (url) => {
    const response = await apiClient.post('/api/analyze', { url });
    return response.data;
};

export const downloadVideo = async (url, formatId, title = '') => {
    try {
        const response = await apiClient.post(
            '/api/download',
            { url, formatId, title },
            { responseType: 'blob', timeout: 300000 }
        );

        const blob = new Blob([response.data], { type: response.headers['content-type'] });
        const downloadUrl = window.URL.createObjectURL(blob);

        let fn = title ? `${title}.mp4` : 'download';
        const contentDisposition = response.headers['content-disposition'];
        if (contentDisposition) {
            const match = contentDisposition.match(/filename="?([^"]+)"?/);
            if (match && match[1]) {
                fn = match[1];
            }
        }

        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', fn);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
        // ─── FIX: axios returns error body as a Blob when responseType is 'blob'.
        // We need to read it as text to get the JSON error detail from FastAPI.
        if (err.response && err.response.data instanceof Blob) {
            try {
                const text = await err.response.data.text();
                const json = JSON.parse(text);
                err.serverDetail = json.detail || text;
            } catch {
                err.serverDetail = 'Server error';
            }
            // Attach parsed detail so callers can access it
            err.message = err.serverDetail;
        }
        throw err;
    }
};
