import fs from 'node:fs/promises';
import { Workbook, SpreadsheetFile } from '@oai/artifact-tool';

const [input, output, ...flags] = process.argv.slice(2);
if (!input || !output) throw new Error('Expected bank.json and output.xlsx');
try { await fs.access(output); throw new Error('Workbook already exists; preserving manual edits.'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const bank = JSON.parse(await fs.readFile(input, 'utf8'));
const wb = Workbook.create();
function literal(value) {
  if (typeof value === 'string' && value.length > 32767) throw new Error('Excel cell exceeds 32767 characters');
  return typeof value === 'string' && value.startsWith('=') ? "'" + value : value ?? '';
}
function sheet(name, headers, rows) {
  if (rows.length > 1048575) throw new Error('Excel row limit exceeded');
  const ws = wb.worksheets.add(name);
  ws.showGridLines = false;
  ws.getRangeByIndexes(0,0,1,headers.length).values = [headers];
  if (rows.length) ws.getRangeByIndexes(1,0,rows.length,headers.length).values = rows.map(row => row.map(literal));
  const range = ws.getRangeByIndexes(0,0,Math.max(2,rows.length+1),headers.length);
  range.format.font = {name:'Arial',size:11};
  range.format.columnWidth = 22;
  range.format.wrapText = true;
  range.format.verticalAlignment = 'top';
  const header = ws.getRangeByIndexes(0,0,1,headers.length);
  header.format = {fill:'#386641',font:{name:'Arial',size:11,bold:true,color:'#FFFFFF'},rowHeight:34};
  ws.freezePanes.freezeRows(1);
  if (rows.length) ws.tables.add(`A1:${String.fromCharCode(64+headers.length)}${rows.length+1}`,true,name+'Table');
  return ws;
}
const headers = ['question_number','section_label','question_text','options','correct_answer','explanation',
  'source_page','answer_source_page','question_type','review_status','review_notes','diagram_markdown',
  'source_quote','answer_source_quote','question_id'];
const rows = bank.questions.map(q => [q.question_number,q.section_label,q.question_text,
  q.options.map(o=>`${o.label}. ${o.text}`).join('\n'),
  q.correct_answer,q.explanation,q.source_page,q.answer_source_page || '',q.question_type,q.review_status,
  q.review_notes,q.diagram_markdown,q.source_quote,q.answer_source_quote,q.question_id]);
const questions = sheet('Questions',headers,rows);
questions.getRange('B:B').format.columnWidth = 28;
questions.getRange('C:C').format.columnWidth = 65;
questions.getRange('D:D').format.columnWidth = 45;
questions.getRange('F:F').format.columnWidth = 55;
questions.getRange('K:N').format.columnWidth = 65;
if (rows.length) {
  questions.getRange(`A2:O${rows.length+1}`).format.autofitRows();
  questions.getRange(`J2:J${rows.length+1}`).dataValidation = {rule:{type:'list',values:['pending','corrected','verified','rejected']}};
  questions.getRange(`J2:J${rows.length+1}`).conditionalFormats.add('containsText',{text:'pending',format:{fill:'#FFF2CC'}});
}
const markdown = await fs.readFile(bank.source_markdown, 'utf8');
const sourceRows = [];
for (let start=0; start<markdown.length; start+=30000)
  sourceRows.push([Math.floor(start/30000)+1,markdown.slice(start,start+30000)]);
const source = sheet('Source',['part','markdown'],sourceRows);
source.getRange('B:B').format.columnWidth = 110;
if (sourceRows.length) source.getRange(`A2:B${sourceRows.length+1}`).format.rowHeight = 110;
const unresolved = sheet('Review',['source_page','unresolved_content'],
  (bank.unresolved ?? []).map(item=>[item.source_page,item.text]));
unresolved.getRange('B:B').format.columnWidth = 110;
if (bank.unresolved?.length) unresolved.getRange(`A2:B${bank.unresolved.length+1}`).format.autofitRows();
wb.recalculate();
if (flags.includes('--preview')) {
  console.log((await wb.inspect({kind:'table',range:'Questions!A1:J4',include:'values,formulas',tableMaxRows:4,tableMaxCols:10})).ndjson);
  for (const [sheetName,range] of [['Questions','A1:D4'],['Source','A1:B2'],['Review','A1:B4']]) {
    const png = await wb.render({sheetName,range,scale:1,format:'png'});
    await fs.writeFile(output+'.'+sheetName+'.png', new Uint8Array(await png.arrayBuffer()));
  }
}
await (await SpreadsheetFile.exportXlsx(wb)).save(output);
console.log(output);
