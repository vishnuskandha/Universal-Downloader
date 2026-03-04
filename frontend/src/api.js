import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
});

// ─── Platform Detection ─────────────────────────────────────────────
function isYouTubeUrl(url) {
    return /(?:youtube\.com|youtu\.be|youtube-nocookie\.com)/i.test(url);
}

// ─── Cobalt-based download (YouTube on datacenter IPs) ──────────────
// Used when VITE_USE_COBALT=true (for Render/datacenter deployments)
export const cobaltDownload = async (url, quality = '1080', mode = 'auto') => {
    const response = await apiClient.post('/api/cobalt', {
        url,
        quality,
        codec: 'h264',
        mode,
    });

    const { url: downloadUrl, filename } = response.data;
    if (!downloadUrl) {
        throw new Error('No download URL returned from cobalt');
    }

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', filename || 'download.mp4');
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return { filename };
};

// ─── yt-dlp based analyze ───────────────────────────────────────────
export const analyzeUrl = async (url) => {
    const response = await apiClient.post('/api/analyze', { url });
    return response.data;
};

// ─── yt-dlp based download ──────────────────────────────────────────
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
        if (err.response && err.response.data instanceof Blob) {
            try {
                const text = await err.response.data.text();
                const json = JSON.parse(text);
                err.serverDetail = json.detail || text;
            } catch {
                err.serverDetail = 'Server error';
            }
            err.message = err.serverDetail;
        }
        throw err;
    }
};

export { isYouTubeUrl };
