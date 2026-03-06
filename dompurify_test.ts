import DOMPurify from 'dompurify';
const hook = (node: Element) => {};
DOMPurify.addHook('afterSanitizeAttributes', hook);
DOMPurify.sanitize('test');
DOMPurify.removeAllHooks();
