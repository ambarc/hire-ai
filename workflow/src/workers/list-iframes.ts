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

        // Get all frames and iframes
        const frameInfo = await page.evaluate(() => {
            function generateSelector(element: Element): string {
                if (element.id) {
                    return `#${element.id}`;
                }
                
                if (element.hasAttribute('name')) {
                    return `${element.tagName.toLowerCase()}[name="${element.getAttribute('name')}"]`;
                }

                let path = [];
                let current = element;
                
                while (current) {
                    let selector = current.tagName.toLowerCase();
                    let parent = current.parentElement;
                    
                    if (parent) {
                        let siblings = Array.from(parent.children);
                        if (siblings.length > 1) {
                            let index = siblings.indexOf(current) + 1;
                            selector += `:nth-child(${index})`;
                        }
                    }
                    
                    path.unshift(selector);
                    current = parent;
                }
                
                return path.join(' > ');
            }

            function getFrameContent(element: HTMLElement | HTMLFrameElement | HTMLIFrameElement, depth = 0): any {
                // Get all attributes
                const attributes = Array.from(element.attributes).reduce((acc, attr) => {
                    acc[attr.name] = attr.value;
                    return acc;
                }, {} as Record<string, string>);

                // Get computed styles
                const styles = window.getComputedStyle(element);

                // Initialize frame-specific properties
                let currentSrc = '';
                let contentSrc = '';
                let hasInnerDocument = false;
                let innerHtml = '';
                let outerHtml = element.outerHTML || '';
                let childFrames: any[] = [];
                
                // Handle different types of frames
                if ('src' in element) {
                    currentSrc = (element as HTMLFrameElement | HTMLIFrameElement).src || '';
                }

                try {
                    // Try to access content document for frames and iframes
                    const contentDoc = (element as HTMLFrameElement | HTMLIFrameElement).contentDocument;
                    if (contentDoc) {
                        contentSrc = contentDoc.location?.href || '';
                        hasInnerDocument = true;
                        innerHtml = contentDoc.documentElement?.outerHTML || '';

                        // Recursively get nested frames
                        const frames = Array.from(contentDoc.getElementsByTagName('frame'));
                        const iframes = Array.from(contentDoc.getElementsByTagName('iframe'));
                        const framesets = Array.from(contentDoc.getElementsByTagName('frameset'));
                        const nestedFrames = frames.concat(iframes).concat(framesets);

                        if (nestedFrames.length > 0) {
                            childFrames = nestedFrames.map((frame, idx) => 
                                getFrameContent(frame as HTMLElement, depth + 1)
                            );
                        }
                    }
                } catch (e) {
                    // Cross-origin access might be blocked
                    contentSrc = 'Access denied (cross-origin)';
                }

                return {
                    type: element.tagName.toLowerCase(),
                    index: depth,
                    attributes,
                    dimensions: {
                        width: styles.width,
                        height: styles.height
                    },
                    position: element.getBoundingClientRect(),
                    isVisible: styles.display !== 'none' && styles.visibility !== 'hidden',
                    selector: generateSelector(element),
                    sources: {
                        attribute: currentSrc,
                        content: contentSrc
                    },
                    hasInnerDocument,
                    innerHtml,
                    outerHtml,
                    childFrames
                };
            }

            // Get all top-level frames
            const frames = Array.from(document.getElementsByTagName('frame'));
            const iframes = Array.from(document.getElementsByTagName('iframe'));
            const framesets = Array.from(document.getElementsByTagName('frameset'));
            const allFrames = frames.concat(iframes).concat(framesets);

            return allFrames.map((frame, idx) => getFrameContent(frame as HTMLElement));
        });

        console.log('\nFound frames:', frameInfo.length);
        console.log('===================');
        
        function logFrameInfo(frame: any, depth = 0) {
            const indent = '  '.repeat(depth);
            console.log(`\n${indent}${frame.type} ${frame.index}:`);
            console.log(`${indent}Attributes:`);
            Object.entries(frame.attributes).forEach(([key, value]) => {
                console.log(`${indent}  ${key}: ${value}`);
            });
            
            console.log(`${indent}Sources:`);
            console.log(`${indent}  Attribute src: ${frame.sources.attribute}`);
            console.log(`${indent}  Content src: ${frame.sources.content}`);
            console.log(`${indent}  Has inner document: ${frame.hasInnerDocument}`);
            
            console.log(`${indent}Dimensions:`);
            console.log(`${indent}  Width: ${frame.dimensions.width}`);
            console.log(`${indent}  Height: ${frame.dimensions.height}`);
            
            console.log(`${indent}Position:`);
            console.log(`${indent}  Top: ${frame.position.top}`);
            console.log(`${indent}  Left: ${frame.position.left}`);
            
            console.log(`${indent}Visible: ${frame.isVisible}`);
            console.log(`${indent}CSS Selector: ${frame.selector}`);

            if (frame.childFrames.length > 0) {
                console.log(`${indent}Child frames: ${frame.childFrames.length}`);
                frame.childFrames.forEach((child: any) => logFrameInfo(child, depth + 1));
            }
            
            console.log(`${indent}-------------------`);
        }

        frameInfo.forEach(frame => logFrameInfo(frame));

        console.log('\nSaving frame contents...');
        
        async function saveFrameContent(frame: any, outputDir: string, parentIndex = '') {
            try {
                const frameIndex = parentIndex ? `${parentIndex}_${frame.index}` : `${frame.index}`;
                
                if (frame.hasInnerDocument) {
                    const combinedContent = `
<!-- Original ${frame.type} element -->
${frame.outerHtml}

<!-- Inner document content -->
${frame.innerHtml}`;
                    
                    const filename = sanitizeFilename(`${frame.type}_${frameIndex}_complete.html`);
                    const filePath = path.join(outputDir, filename);
                    await fs.writeFile(filePath, combinedContent);
                    console.log(`Saved complete content for ${frame.type} ${frameIndex} to ${filename}`);
                }

                // Save source URL content if available
                const sourceUrl = frame.sources.attribute;
                if (sourceUrl && sourceUrl !== 'about:blank') {
                    try {
                        const response = await fetch(sourceUrl);
                        const content = await response.text();
                        const filename = sanitizeFilename(`${frame.type}_${frameIndex}_${new URL(sourceUrl).hostname}.html`);
                        const filePath = path.join(outputDir, filename);
                        await fs.writeFile(filePath, content);
                        console.log(`Saved source content for ${frame.type} ${frameIndex} to ${filename}`);
                    } catch (error) {
                        console.error(`Failed to fetch source content for ${frame.type} ${frameIndex}:`, error.message);
                    }
                }

                // Recursively save child frames
                for (const childFrame of frame.childFrames) {
                    await saveFrameContent(childFrame, outputDir, frameIndex);
                }

            } catch (error) {
                console.error(`Failed to save ${frame.type} ${frame.index} content:`, error.message);
            }
        }

        // Save all frames
        for (const frame of frameInfo) {
            await saveFrameContent(frame, outputDir);
        }

        console.log(`\nAll frame contents saved to: ${outputDir}`);

        return frameInfo;

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
} } 
