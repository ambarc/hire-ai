import puppeteer from 'puppeteer';

export async function listIframes(url: string) {
    let browser = null;
    
    try {
        // Connect to existing Chrome debug instance
        console.log('Connecting to existing Chrome instance...');
        browser = await puppeteer.connect({
            browserURL: 'http://localhost:9222',
            defaultViewport: null
        });

        // Create new page
        const page = await browser.newPage();
        await page.setDefaultTimeout(30000);

        // Navigate to website
        console.log(`Navigating to ${url}...`);
        await page.goto(url, { 
            waitUntil: ['load', 'domcontentloaded'],
            timeout: 60000 
        });

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

                return {
                    index: index + 1,
                    attributes,
                    dimensions: {
                        width: styles.width,
                        height: styles.height
                    },
                    position: iframe.getBoundingClientRect(),
                    isVisible: styles.display !== 'none' && styles.visibility !== 'hidden',
                    selector: generateSelector(iframe)
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