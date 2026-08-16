(async function() {
    console.log("%cStarting Threads Clone-and-Stash capture...", "color: #00ff00; font-size: 16px; font-weight: bold;");
    console.log("Please wait while the page auto-scrolls. Do not click anywhere.");
    
    // Create the vault container
    const vault = document.createElement('div');
    vault.id = 'archive-vault';
    vault.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; min-height: 100vh; background-color: inherit; z-index: 999999; display: none; padding-top: 50px; padding-bottom: 100px;';
    document.body.appendChild(vault);

    const vaultTitle = document.createElement('h1');
    vaultTitle.innerText = "Saved Threads Feed (Static)";
    vaultTitle.style.cssText = 'text-align: center; font-family: sans-serif; margin-bottom: 30px;';
    vault.appendChild(vaultTitle);

    const vaultContent = document.createElement('div');
    vaultContent.style.cssText = 'max-width: 600px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px;';
    vault.appendChild(vaultContent);
    
    // Create a floating status indicator
    const statusToast = document.createElement('div');
    statusToast.id = 'archive-status-toast';
    statusToast.style.cssText = 'position: fixed; bottom: 20px; right: 20px; background: rgba(0,0,0,0.8); color: #0f0; padding: 15px 25px; z-index: 9999999; border-radius: 8px; font-family: monospace; font-size: 14px; border: 1px solid #0f0; box-shadow: 0 4px 12px rgba(0,0,0,0.5); pointer-events: none;';
    statusToast.innerText = 'Capturing: 0 posts... (Scrolling)';
    document.body.appendChild(statusToast);

    // Set to keep track of seen posts (using text content and links as signature)
    const seenSignatures = new Set();
    
    function captureVisiblePosts() {
        // --- CAPTURE POSTS ---
        let posts = Array.from(document.querySelectorAll('div[data-pressable-container="true"]'));
        if (posts.length === 0) {
             posts = Array.from(document.querySelectorAll('div[role="article"]'));
        }
        
        // Filter 1: Must contain a valid post link
        posts = posts.filter(post => post.querySelector('a[href*="/post/"]') !== null);
        
        // Filter 2: Remove nested posts to capture only the outermost container
        posts = posts.filter(post => {
            let parent = post.parentElement;
            while (parent && parent.tagName !== 'BODY') {
                if ((parent.dataset && parent.dataset.pressableContainer === "true") || parent.getAttribute('role') === 'article') {
                    return false;
                }
                parent = parent.parentElement;
            }
            return true;
        });

        // --- CAPTURE PROFILE HEADER (Bio + Tabs) ---
        if (!seenSignatures.has('PROFILE_HEADER')) {
            const allSpans = Array.from(document.querySelectorAll('span'));
            // Match "followers" or "follower"
            const followerSpan = allSpans.find(s => s.innerText && s.innerText.trim().match(/^[0-9,.KM]+\s+followers?$/i));
            
            if (followerSpan) {
                let node = followerSpan;
                let headerNode = null;
                
                // Walk up the DOM to find the highest container that strictly belongs to the header (does not contain posts)
                while (node && node.tagName !== 'BODY' && node.tagName !== 'MAIN') {
                    if (node.querySelector('a[href*="/post/"]')) break;
                    headerNode = node;
                    node = node.parentElement;
                }
                
                if (headerNode) {
                    let elementsToCapture = [headerNode];
                    
                    // The Tabs (Threads/Replies) are usually sibling elements that sit immediately after the Bio.
                    // Let's capture all siblings that come after the Bio, until we hit the Feed (which contains posts).
                    let sibling = headerNode.nextElementSibling;
                    while (sibling) {
                        if (sibling.querySelector('a[href*="/post/"]')) break;
                        elementsToCapture.push(sibling);
                        sibling = sibling.nextElementSibling;
                    }
                    
                    // Also capture preceding siblings just in case (e.g. navigation elements above the bio)
                    sibling = headerNode.previousElementSibling;
                    while (sibling) {
                        if (sibling.querySelector('a[href*="/post/"]')) break;
                        elementsToCapture.unshift(sibling);
                        sibling = sibling.previousElementSibling;
                    }
                    
                    const headerWrapper = document.createElement('div');
                    headerWrapper.style.cssText = 'position: relative; transform: none; display: flex; flex-direction: column; width: 100%;';
                    
                    elementsToCapture.forEach(el => {
                        const clone = el.cloneNode(true);
                        clone.style.display = clone.style.display === 'none' ? 'block' : clone.style.display;
                        headerWrapper.appendChild(clone);
                    });
                    
                    vaultContent.insertBefore(headerWrapper, vaultContent.firstChild);
                    seenSignatures.add('PROFILE_HEADER');
                    console.log("%c[Vault] Captured Profile Header & Tabs!", "color: #ffaa00;");
                }
            }
        }

        posts.forEach(post => {
            // Extract the primary Post ID for this container
            let primaryLink = post.querySelector('a[href*="/post/"]');
            
            let signature = null;
            if (primaryLink) {
                // Extract just the ID, stripping away any tracking parameters
                const match = primaryLink.href.match(/\/post\/([a-zA-Z0-9_-]+)/);
                if (match) signature = match[1];
            }
            
            // Fallback for posts without links
            if (!signature) {
                signature = post.innerText.replace(/\s+/g, ' ').trim().substring(0, 50);
            }

            // Avoid empty clones and duplicates
            if (signature.length > 5 && !seenSignatures.has(signature)) {
                seenSignatures.add(signature);
                
                // Clone the post and all its children deeply
                const clone = post.cloneNode(true);
                
                // Reset styling to prevent virtualization artifacts
                clone.style.position = 'relative';
                clone.style.visibility = 'visible';
                clone.style.opacity = '1';
                clone.style.display = 'block';
                clone.style.transform = 'none'; 
                clone.style.top = 'auto';
                clone.style.left = 'auto';
                
                vaultContent.appendChild(clone);
                console.log(`%c[Vault] Stashed post #${seenSignatures.size}`, "color: #00aaff;");
                statusToast.innerText = `Capturing: ${seenSignatures.size} posts... (Scrolling)\nTo stop early, type: stopCapture()`;
            }
        });
    }

    // Auto-scroll loop
    const scrollStep = 500; // pixels to scroll per tick (slow enough to load images)
    const tickInterval = 600; // ms between ticks
    let unchangedTicks = 0;
    let lastScrollY = -1;

    const scrollTimer = setInterval(() => {
        captureVisiblePosts();
        
        window.scrollBy(0, scrollStep);
        
        // Check if we've reached the bottom
        const currentScrollY = window.scrollY;
        
        if (currentScrollY === lastScrollY) {
            unchangedTicks++;
            // Wait before giving up to allow older posts to load
            if (unchangedTicks >= 25) { 
                console.log("Reached the bottom of the feed (or loading stalled).");
                finish();
            } else {
                statusToast.innerText = `Loading older posts... (${unchangedTicks}/25)\nTotal captured: ${seenSignatures.size}`;
            }
        } else {
            unchangedTicks = 0;
            lastScrollY = currentScrollY;
        }
    }, tickInterval);

    async function finish() {
        clearInterval(scrollTimer);
        captureVisiblePosts(); // Final capture pass
        
        console.log("%c========================================", "color: #ff00ff;");
        console.log("%cCapture Complete! Activating Vault...", "color: #00ff00; font-size: 16px; font-weight: bold;");
        
        // Hide original app elements
        Array.from(document.body.children).forEach(child => {
            if (child.id !== 'archive-vault' && child.tagName !== 'SCRIPT' && child.tagName !== 'STYLE' && child.tagName !== 'LINK') {
                child.style.display = 'none';
            }
        });
        
        // Also force the HTML and BODY to be scrollable and native height
        document.documentElement.style.height = 'auto';
        document.documentElement.style.overflow = 'auto';
        document.body.style.height = 'auto';
        document.body.style.overflow = 'auto';
        // Removed hardcoded background so it keeps the original theme
        
        // Reveal the vault
        vault.style.display = 'block';
        window.scrollTo(0, 0);

        console.log("%c========================================", "color: #ff00ff;");
        console.log("Generating perfect standalone HTML file for download...");

        // 1. Create a deep clone of the entire document to preserve all themes and classes
        const htmlClone = document.documentElement.cloneNode(true);

        // 2. Remove script tags to prevent React initialization
        htmlClone.querySelectorAll('script').forEach(s => s.remove());

        // 2.5 Remove Security Policies and CORS attributes that block images on local files
        htmlClone.querySelectorAll('meta[http-equiv="Content-Security-Policy"], meta[http-equiv="content-security-policy"]').forEach(m => m.remove());
        htmlClone.querySelectorAll('[crossorigin]').forEach(el => el.removeAttribute('crossorigin'));
        htmlClone.querySelectorAll('[loading]').forEach(el => el.removeAttribute('loading'));

        // 3. Convert all relative URLs to absolute URLs so images and stylesheets load perfectly offline
        const makeAbsolute = (attr) => {
            htmlClone.querySelectorAll(`[${attr}]`).forEach(el => {
                try {
                    // Ignore data URIs and empty attributes
                    const val = el.getAttribute(attr);
                    if (val && !val.startsWith('data:')) {
                        const url = new URL(val, window.location.href);
                        el.setAttribute(attr, url.href);
                    }
                } catch(e) {}
            });
        };
        makeAbsolute('href');
        makeAbsolute('src');
        
        // Handle SVG profile pictures (fixes the invalid selector crash)
        htmlClone.querySelectorAll('image').forEach(el => {
            try {
                let val = el.getAttribute('href') || el.getAttribute('xlink:href');
                if (val && !val.startsWith('data:')) {
                    const url = new URL(val, window.location.href).href;
                    if (el.hasAttribute('xlink:href')) el.setAttribute('xlink:href', url);
                    else el.setAttribute('href', url);
                }
            } catch(e) {}
        });
        
        // 3.5 Remove srcset to fallback to standard src
        htmlClone.querySelectorAll('[srcset]').forEach(el => el.removeAttribute('srcset'));
        htmlClone.querySelectorAll('[referrerpolicy]').forEach(el => el.removeAttribute('referrerpolicy'));

        // 3.6 Inject meta referrer to bypass CDN hotlinking restrictions
        const noReferrerMeta = document.createElement('meta');
        noReferrerMeta.name = "referrer";
        noReferrerMeta.content = "no-referrer";
        const head = htmlClone.querySelector('head');
        if (head) head.insertBefore(noReferrerMeta, head.firstChild);

        // 4. Remove all original hidden React DOM elements from the clone to reduce file size
        const cloneBody = htmlClone.querySelector('body');
        Array.from(cloneBody.children).forEach(child => {
            if (child.id !== 'archive-vault' && child.tagName !== 'STYLE' && child.tagName !== 'LINK') {
                child.remove();
            }
        });
        
        // Clean up our visual toast from the offline file
        const offlineToast = htmlClone.querySelector('#archive-status-toast');
        if (offlineToast) offlineToast.remove();

        console.log("Downloading and embedding profile pictures...");
        statusToast.innerText = 'Baking images into file... Please wait.';

        // 4.5 Convert profile pictures to Base64 to bypass CDN blocks
        const imgs = Array.from(htmlClone.querySelectorAll('img'));
        const imageCache = new Map();
        
        const fetchPromises = imgs.map(async (img) => {
            const src = img.getAttribute('src');
            
            // Only target small images (profile pictures)
            const isProfilePic = (img.width && img.width <= 50) || (img.height && img.height <= 50) || (img.className && img.className.includes('x1iwo8zk'));
            
            if (src && src.startsWith('http') && src.includes('instagram') && isProfilePic) {
                // Reuse cached images
                if (imageCache.has(src)) {
                    img.setAttribute('src', imageCache.get(src));
                    return;
                }
                
                try {
                    const response = await fetch(src);
                    const blob = await response.blob();
                    const dataUrl = await new Promise(resolve => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.readAsDataURL(blob);
                    });
                    imageCache.set(src, dataUrl);
                    img.setAttribute('src', dataUrl);
                } catch(e) {
                    // Fallback if fetch fails
                }
            }
        });

        await Promise.all(fetchPromises);

        // 5. Generate final HTML and trigger download
        const finalHTML = '<!DOCTYPE html>\\n' + htmlClone.outerHTML;

        const blob = new Blob([finalHTML], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Threads_Archive_${new Date().getTime()}.html`;
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);

        console.log("Download triggered! You now have a perfect offline HTML file.");
    }

    // Escape hatch: run `window.stopCapture()` in console to finish early
    window.stopCapture = function() {
        console.log("Manual stop triggered.");
        finish();
    };

})();
