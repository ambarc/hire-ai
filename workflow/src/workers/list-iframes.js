"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listIframes = listIframes;
var puppeteer_1 = __importDefault(require("puppeteer"));
function listIframes(url) {
    return __awaiter(this, void 0, void 0, function () {
        var browser, page, iframeInfo, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    browser = null;
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 7, 8, 11]);
                    // Connect to existing Chrome debug instance
                    console.log('Connecting to existing Chrome instance...');
                    return [4 /*yield*/, puppeteer_1.default.connect({
                            browserURL: 'http://localhost:9222',
                            defaultViewport: null
                        })];
                case 2:
                    browser = _a.sent();
                    return [4 /*yield*/, browser.newPage()];
                case 3:
                    page = _a.sent();
                    return [4 /*yield*/, page.setDefaultTimeout(30000)];
                case 4:
                    _a.sent();
                    // Navigate to website
                    console.log("Navigating to ".concat(url, "..."));
                    return [4 /*yield*/, page.goto(url, {
                            waitUntil: ['load', 'domcontentloaded'],
                            timeout: 60000
                        })];
                case 5:
                    _a.sent();
                    return [4 /*yield*/, page.evaluate(function () {
                            var iframes = document.querySelectorAll('iframe');
                            return Array.from(iframes).map(function (iframe, index) {
                                // Get all attributes
                                var attributes = Array.from(iframe.attributes).reduce(function (acc, attr) {
                                    acc[attr.name] = attr.value;
                                    return acc;
                                }, {});
                                // Get computed styles
                                var styles = window.getComputedStyle(iframe);
                                return {
                                    index: index + 1,
                                    attributes: attributes,
                                    dimensions: {
                                        width: styles.width,
                                        height: styles.height
                                    },
                                    position: iframe.getBoundingClientRect(),
                                    isVisible: styles.display !== 'none' && styles.visibility !== 'hidden',
                                    selector: generateSelector(iframe)
                                };
                            });
                            function generateSelector(element) {
                                if (element.id) {
                                    return "#".concat(element.id);
                                }
                                var selector = element.tagName.toLowerCase();
                                if (element.className) {
                                    selector += ".".concat(element.className.split(' ').join('.'));
                                }
                                // Add data attributes if present
                                Array.from(element.attributes)
                                    .filter(function (attr) { return attr.name.startsWith('data-'); })
                                    .forEach(function (attr) {
                                    selector += "[".concat(attr.name, "=\"").concat(attr.value, "\"]");
                                });
                                return selector;
                            }
                        })];
                case 6:
                    iframeInfo = _a.sent();
                    console.log('\nFound iframes:', iframeInfo.length);
                    console.log('===================');
                    iframeInfo.forEach(function (iframe) {
                        console.log("\nIframe ".concat(iframe.index, ":"));
                        console.log('Attributes:');
                        Object.entries(iframe.attributes).forEach(function (_a) {
                            var key = _a[0], value = _a[1];
                            console.log("  ".concat(key, ": ").concat(value));
                        });
                        console.log('Dimensions:');
                        console.log("  Width: ".concat(iframe.dimensions.width));
                        console.log("  Height: ".concat(iframe.dimensions.height));
                        console.log('Position:');
                        console.log("  Top: ".concat(iframe.position.top));
                        console.log("  Left: ".concat(iframe.position.left));
                        console.log("Visible: ".concat(iframe.isVisible));
                        console.log("CSS Selector: ".concat(iframe.selector));
                        console.log('-------------------');
                    });
                    return [2 /*return*/, iframeInfo];
                case 7:
                    error_1 = _a.sent();
                    console.error('Error occurred:', error_1);
                    throw error_1;
                case 8:
                    if (!browser) return [3 /*break*/, 10];
                    return [4 /*yield*/, browser.disconnect()];
                case 9:
                    _a.sent();
                    console.log('\nDisconnected from Chrome instance');
                    _a.label = 10;
                case 10: return [7 /*endfinally*/];
                case 11: return [2 /*return*/];
            }
        });
    });
}
// Example usage:
if (require.main === module) {
    var url = process.argv[2];
    if (!url) {
        console.error('Please provide a URL as an argument');
        process.exit(1);
    }
    listIframes(url)
        .then(function () { return process.exit(0); })
        .catch(function (error) {
        console.error('Error:', error);
        process.exit(1);
    });
}
