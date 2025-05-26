self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    if (url.searchParams.has('antiDPI')) {
        // Sửa đổi yêu cầu để thêm header ngẫu nhiên
        const modifiedRequest = new Request(event.request, {
            headers: new Headers({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'X-Anti-DPI': 'Noise-' + Math.random().toString(36).substring(2),
                'Host ': url.hostname // Thêm khoảng trắng vào Host
            })
        });
        event.respondWith(fetch(modifiedRequest));
    }
});