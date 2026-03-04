import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
});

// ─── Platform Detection ─────────────────────────────────────────────
function isYouTubeUrl(url) {
    return /(?:youtube\.com|youtu\.be|youtube-nocookie\.com)/i.test(url);
}

// ─── Cobalt-based download (YouTube) ────────────────────────────────
// Production approach: cobalt handles YouTube's bot detection and
// returns a direct download URL. No video bytes pass through our server.
export const cobaltDownload = async (url, quality = '1080', mode = 'auto') => {
    const response = await apiClient.post('/api/cobalt', {
        url,
        quality,
        codec: 'h264',   // H.264 for WhatsApp/iPhone compatibility
        mode,
    });

    const { url: downloadUrl, filename } = response.data;
    if (!downloadUrl) {
        throw new Error('No download URL returned from cobalt');
    }

    // Trigger download via hidden anchor — direct from cobalt CDN
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', filename || 'download.mp4');
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return { filename };
};

// ─── yt-dlp based analyze (Facebook, Instagram, local) ──────────────
export const analyzeUrl = async (url) => {
    const response = await apiClient.post('/api/analyze', { url });
    return response.data;
};

// ─── yt-dlp based download (Facebook, Instagram, local) ─────────────
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

// ─── Smart Download (auto-detect platform) ──────────────────────────
// YouTube → cobalt (production, no bot detection issues)
// Facebook/Instagram → yt-dlp (works fine on datacenter IPs)
export const smartDownload = async (url, formatId, title, quality = '1080') => {
    if (isYouTubeUrl(url)) {
        return cobaltDownload(url, quality);
    } else {
        return downloadVideo(url, formatId, title);
    }
};

export { isYouTubeUrl };
