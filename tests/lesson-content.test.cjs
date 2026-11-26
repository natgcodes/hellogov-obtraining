// Run from the repository root after installing its existing dependencies:
// node tests/lesson-content.test.cjs
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/lib/lesson/content.ts'), 'utf8');
const compiled = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const ctx = {exports:{},URL};
vm.runInNewContext(compiled,ctx);
const {lessonMedia,safeHttps,referenceMaterials,isLesson,isContent,lessonOrder}=ctx.exports;
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS',name);}
const base={id:'a',title:'Example',description:null,material_type:'video',url:null,is_required:true,position:1};
test('legacy material remains legacy',()=>assert.equal(isLesson(base),false));
test('new reading is a content block',()=>assert.equal(isContent({...base,lesson_kind:'reading'}),true));
test('bookmark task is not a lesson block',()=>assert.equal(isContent({...base,lesson_kind:'bookmarks'}),false));
test('reference-only item is not a lesson block',()=>assert.equal(isContent({...base,lesson_kind:'reference'}),false));
test('Drive share link converts to preview',()=>assert.equal(lessonMedia('video','https://drive.google.com/file/d/AbC_123/view?usp=sharing').src,'https://drive.google.com/file/d/AbC_123/preview'));
test('Drive open link converts to preview',()=>assert.equal(lessonMedia('video','https://drive.google.com/open?id=AbC-123').src,'https://drive.google.com/file/d/AbC-123/preview'));
test('Drive resource key is preserved',()=>assert.equal(lessonMedia('video','https://drive.google.com/file/d/AbC_123/view?resourcekey=0-key').src,'https://drive.google.com/file/d/AbC_123/preview?resourcekey=0-key'));
test('Loom share link converts to embed',()=>assert.equal(lessonMedia('video','https://www.loom.com/share/AbC123').src,'https://www.loom.com/embed/AbC123'));
test('private Slides link uses preview without publishing',()=>assert.equal(lessonMedia('presentation','https://docs.google.com/presentation/d/AbC123/edit').src,'https://docs.google.com/presentation/d/AbC123/preview'));
test('already published Slides link stays an embed',()=>assert.equal(lessonMedia('presentation','https://docs.google.com/presentation/d/e/AbC123/pub').src,'https://docs.google.com/presentation/d/e/AbC123/embed'));
test('Supademo share link converts to embed',()=>assert.equal(lessonMedia('interactive','https://app.supademo.com/demo/abc123').src,'https://app.supademo.com/embed/abc123'));
test('external PDF link is recognized',()=>assert.equal(lessonMedia('pdf','https://example.com/guide.pdf?download=0').provider,'External PDF'));
test('external images use image mode',()=>assert.equal(lessonMedia('image','https://example.com/img.png').mode,'image'));
test('unknown video host is not embedded',()=>assert.equal(lessonMedia('video','https://example.com/video').mode,'external'));
test('look-alike Loom host cannot be embedded',()=>assert.equal(lessonMedia('video','https://www.loom.com.evil.example/share/x').mode,'external'));
test('javascript and data URLs rejected',()=>{assert.equal(safeHttps('javascript:alert(1)'),null);assert.equal(safeHttps('data:text/html,hi'),null);});
test('credentialed links rejected',()=>assert.equal(safeHttps('https://www.loom.com@evil.example/share/x'),null));
test('HTTP URLs rejected',()=>assert.equal(safeHttps('http://example.com/file'),null));
test('lesson order does not depend on legacy material position',()=>assert.ok(lessonOrder({...base,lesson_order:2,position:1},{...base,id:'b',lesson_order:1,position:10})>0));
test('duplicate legacy/reference URLs are not displayed twice',()=>assert.equal(referenceMaterials([{...base,url:'https://example.com/a'},{...base,id:'b',lesson_kind:'video',lesson_reference:true,url:'https://example.com/a'}]).length,0));
test('duplicate linked references are shown once',()=>assert.equal(referenceMaterials([{...base,lesson_kind:'reference',lesson_reference:true,url:'https://example.com/b'},{...base,id:'b',lesson_kind:'reference',lesson_reference:true,url:'https://example.com/b'}]).length,1));
test('private assets may be reference resources',()=>assert.equal(referenceMaterials([{...base,lesson_kind:'pdf',lesson_reference:true,lesson_asset_path:'user/file.pdf'}]).length,1));
console.log(`${passed} tests passed.`);
