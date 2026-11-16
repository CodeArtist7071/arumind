// Run with the bundled Node runtime; see README for module setup.
import fs from 'node:fs/promises';
import path from 'node:path';
import { Workbook, SpreadsheetFile } from '@oai/artifact-tool';

const [input, output, ...flags] = process.argv.slice(2);
if (!input || !output) throw new Error('Usage: node export_excel.mjs bank.json bank.xlsx');
try { await fs.access(output); throw new Error('Output exists; choose a new filename to preserve manual reviews.'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const bank = JSON.parse(await fs.readFile(input, 'utf8'));
const wb = Workbook.create();
const fields = ['question_id','question','option_a','option_b','option_c','option_d',
  'correct_answer','explanation','subject','topic','source_file','source_page',
  'review_status','review_notes','exam_id','subject_id','chapter_id','pdf_id','paper_set',
  'difficulty_level','marks','negative_marks','is_active','diagram_present','diagram_url',
  'question_number','question_type','source_snippet'];
function literal(value) {
  if (typeof value === 'string' && value.length > 32767) throw new Error('Excel cell limit exceeded; preserve this record in JSON and split it before export.');
  return typeof value === 'string' && value.startsWith('=') ? "'" + value : value ?? '';
}
function sheet(name, headers, rows) {
  if (rows.length > 1048575) throw new Error('Excel row limit exceeded');
  const ws = wb.worksheets.add(name);
  ws.showGridLines = false;
  ws.getRangeByIndexes(0,0,1,headers.length).values = [headers];
  if (rows.length) ws.getRangeByIndexes(1,0,rows.length,headers.length).values = rows.map(row => row.map(literal));
  const all = ws.getRangeByIndexes(0,0,rows.length+1,headers.length);
  all.format.font = {name:'Arial',size:11};
  all.format.columnWidth = 24;
  all.format.wrapText = true;
  all.format.verticalAlignment = 'top';
  ws.getRangeByIndexes(0,0,1,headers.length).format = {fill:'#386641',font:{name:'Arial',bold:true,color:'#FFFFFF'},rowHeight:32};
  ws.freezePanes.freezeRows(1);
  if (rows.length) ws.tables.add(`A1:${column(headers.length)}${rows.length+1}`,true,name+'Table');
  return ws;
}
function column(n) { let s=''; while(n) { n--; s=String.fromCharCode(65+n%26)+s; n=Math.floor(n/26); } return s; }
const questions = sheet('Questions',fields,bank.questions.map(row => fields.map(key => row[key])));
questions.getRange('B:B').format.columnWidth=65;
questions.getRange('H:H').format.columnWidth=65;
questions.getRange('K:K').format.columnWidth=55;
questions.getRange('N:N').format.columnWidth=65;
const last=Math.max(2,bank.questions.length+1);
questions.getRange(`M2:M${last}`).dataValidation={rule:{type:'list',values:['pending','modified','corrected','verified','rejected']}};
questions.getRange(`G2:G${last}`).dataValidation={rule:{type:'list',values:['A','B','C','D']}};
questions.getRange(`M2:M${last}`).conditionalFormats.add('containsText',{text:'pending',format:{fill:'#FFF2CC'}});
questions.getRangeByIndexes(1,0,Math.max(1,bank.questions.length),fields.length).format.autofitRows();
// Full blocks stay in JSON. Split long text only in this review view, with explicit part numbers.
const blocks=[];
for(const b of bank.raw_blocks ?? []) {
  const text=b.text || JSON.stringify(b.raw);
  for(let start=0;start<Math.max(text.length,1);start+=30000)
    blocks.push([b.source_page,b.block_index,b.type,Math.floor(start/30000)+1,text.slice(start,start+30000),b.asset_directory]);
}
const raw=sheet('Source blocks',['source_page','block_index','type','part','text','asset_directory'],blocks);
raw.getRange('E:E').format.columnWidth=100;
raw.getRange('F:F').format.columnWidth=65;
// Very large paragraphs are intentionally read in the formula bar/JSON; previews use bounded rows.
if(blocks.length) raw.getRange(`A2:F${blocks.length+1}`).format.rowHeight=90;
const notes=sheet('Readme',['Item','Details'],[
 ['Source',bank.source_file ?? ''], ['Extraction complete',bank.extraction_complete ?? false],
 ['Coverage','Candidates may miss questions. Compare Source blocks and the PDF before approve-coverage.'],
 ['Review','Correct every question and answer against the PDF, set verified, then record approval through the CLI.'],
 ['Modified / corrected','These statuses do not grant approval. Any content edit invalidates the saved approval hash.'],
 ['Jev','Disabled. Review uses deterministic validation and human approval.'],
 ['Supabase','Use supabase_publish prepare, review its payload, then upload with its exact hash.'],
 ['Raw JSON',path.resolve(input)]
]);
notes.getRange('B:B').format.columnWidth=110;
notes.getRange('A1:B9').format.autofitRows();
wb.recalculate();
await fs.mkdir(path.dirname(output),{recursive:true});
if (flags.includes('--preview')) for(const [name,range] of [['Questions','A1:D4'],['Source blocks','A1:E4'],['Readme','A1:B9']]) {
  const preview=await wb.render({sheetName:name,range,scale:1,format:'png'});
  await fs.writeFile(output+'.'+name.replaceAll(' ','_')+'.png',new Uint8Array(await preview.arrayBuffer()));
}
await (await SpreadsheetFile.exportXlsx(wb)).save(output);
console.log(output);
