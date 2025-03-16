import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import sanitizeFilename from 'sanitize-filename';

export async function listIframes(url: string) {
    let browser = null;
    
    try {
        // Connect to existing Chrome debug instance
        console.log('Connecting to existing Chrome instance...');
        browser = await puppeteer.connect({
            browserURL: 'http://localhost:9222',
            defaultViewport: null
        });

        // Create output directory
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const outputDir = path.join(process.cwd(), 'iframe-content', timestamp);
        await fs.mkdir(outputDir, { recursive: true });

        // Get all pages and find one that matches our URL
        const pages = await browser.pages();
        let page = pages.find(p => p.url() === url);

        if (!page) {
            // Create new page if no matching page found
            console.log('No existing tab found with the URL, creating new one...');
            page = await browser.newPage();
            await page.setDefaultTimeout(30000);

            // Navigate to website
            console.log(`Navigating to ${url}...`);
            await page.goto(url, { 
                waitUntil: ['load', 'domcontentloaded'],
                timeout: 60000 
            });
        } else {
            console.log('Found existing tab with the URL, reusing it...');
        }

        // Get all iframes
        const iframeInfo = await page.evaluate(() => {
            const iframes = document.querySelectorAll('iframe');
            return Array.from(iframes).map((iframe, index) => {
                // Get all attributes
                const attributes = Array.from(iframe.attributes).reduce((acc, attr) => {
                    acc[attr.name] = attr.value;
                    return acc;
                }, {} as Record<string, string>);

                // Get computed styles
                const styles = window.getComputedStyle(iframe);

                // Get the current src and try to get content document src
                let currentSrc = iframe.src || '';
                let contentSrc = '';
                let hasInnerDocument = false;
                let innerHtml = '';
                let outerHtml = iframe.outerHTML || '';
                
                try {
                    if (iframe.contentDocument) {
                        contentSrc = iframe.contentDocument.location?.href || '';
                        hasInnerDocument = true;
                        innerHtml = iframe.contentDocument.documentElement?.outerHTML || '';
                    }
                } catch (e) {
                    // Cross-origin access might be blocked
                    contentSrc = 'Access denied (cross-origin)';
                }

                return {
                    index: index + 1,
                    attributes,
                    dimensions: {
                        width: styles.width,
                        height: styles.height
                    },
                    position: iframe.getBoundingClientRect(),
                    isVisible: styles.display !== 'none' && styles.visibility !== 'hidden',
                    selector: generateSelector(iframe),
                    sources: {
                        attribute: currentSrc,
                        content: contentSrc
                    },
                    hasInnerDocument,
                    innerHtml,
                    outerHtml
                };
            });

            function generateSelector(element: Element): string {
                if (element.id) {
                    return `#${element.id}`;
                }
                
                let selector = element.tagName.toLowerCase();
                if (element.className) {
                    selector += `.${element.className.split(' ').join('.')}`;
                }
                
                // Add data attributes if present
                Array.from(element.attributes)
                    .filter(attr => attr.name.startsWith('data-'))
                    .forEach(attr => {
                        selector += `[${attr.name}="${attr.value}"]`;
                    });
                
                return selector;
            }
        });

        console.log('\nFound iframes:', iframeInfo.length);
        console.log('===================');
        
        iframeInfo.forEach(iframe => {
            console.log(`\nIframe ${iframe.index}:`);
            console.log('Attributes:');
            Object.entries(iframe.attributes).forEach(([key, value]) => {
                console.log(`  ${key}: ${value}`);
            });
            
            console.log('Sources:');
            console.log(`  Attribute src: ${iframe.sources.attribute}`);
            console.log(`  Content src: ${iframe.sources.content}`);
            console.log(`  Has inner document: ${iframe.hasInnerDocument}`);
            
            console.log('Dimensions:');
            console.log(`  Width: ${iframe.dimensions.width}`);
            console.log(`  Height: ${iframe.dimensions.height}`);
            
            console.log('Position:');
            console.log(`  Top: ${iframe.position.top}`);
            console.log(`  Left: ${iframe.position.left}`);
            
            console.log(`Visible: ${iframe.isVisible}`);
            console.log(`CSS Selector: ${iframe.selector}`);
            console.log('-------------------');
        });

        console.log('\nSaving iframe contents...');
        
        // Modify the saving logic to include the iframe element
        for (const iframe of iframeInfo) {
            try {
                if (iframe.hasInnerDocument) {
                    // Create a combined HTML file with both the iframe element and its content
                    const combinedContent = `
<!-- Original iframe element -->
${iframe.outerHtml}

<!-- Inner document content -->
${iframe.innerHtml}`;
                    
                    const filename = sanitizeFilename(`iframe_${iframe.index}_complete.html`);
                    const filePath = path.join(outputDir, filename);
                    await fs.writeFile(filePath, combinedContent);
                    console.log(`Saved complete content for iframe ${iframe.index} to ${filename}`);
                }

                // Continue with existing source URL saving logic
                const sourceUrl = iframe.sources.attribute;
                if (!sourceUrl || sourceUrl === 'about:blank') {
                    if (!iframe.hasInnerDocument) {
                        console.log(`Skipping iframe ${iframe.index} (no source URL or inner content)`);
                    }
                    continue;
                }

                // Create a new page to fetch the iframe content
                const iframePage = await browser.newPage();
                await iframePage.setDefaultTimeout(30000);

                // Navigate to the iframe URL
                await iframePage.goto(sourceUrl, {
                    waitUntil: ['load', 'domcontentloaded'],
                    timeout: 60000
                });

                // Get the content
                const content = await iframePage.content();

                // Create a sanitized filename
                const filename = sanitizeFilename(`iframe_${iframe.index}_${new URL(sourceUrl).hostname}.html`);
                const filePath = path.join(outputDir, filename);

                // Save the content
                await fs.writeFile(filePath, content);
                console.log(`Saved content for iframe ${iframe.index} to ${filename}`);

                // Close the page
                await iframePage.close();

            } catch (error) {
                console.error(`Failed to save iframe ${iframe.index} content:`, error.message);
            }
        }

        console.log(`\nAll iframe contents saved to: ${outputDir}`);

        return iframeInfo;

    } catch (error) {
        console.error('Error occurred:', error);
        throw error;
    } finally {
        if (browser) {
            await browser.disconnect();
            console.log('\nDisconnected from Chrome instance');
        }
    }
}

// Example usage:
if (require.main === module) {
    const url = process.argv[2];
    if (!url) {
        console.error('Please provide a URL as an argument');
        process.exit(1);
    }
    
    listIframes(url)
        .then(() => process.exit(0))
        .catch(error => {
            console.error('Error:', error);
            process.exit(1);
        });
} 