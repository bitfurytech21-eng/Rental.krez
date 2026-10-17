const fs = require('fs');

const fileContent = fs.readFileSync('src/data/properties.ts', 'utf8');
const startToken = 'const rawProperties: Property[] = [';
const startPos = fileContent.indexOf(startToken);
if (startPos === -1) {
  console.error('Could not find startToken');
  process.exit(1);
}

const arrayContentStart = startPos + startToken.length;
// Find the matching closing bracket for rawProperties array
let bracketCount = 1;
let endPos = -1;
for (let i = arrayContentStart; i < fileContent.length; i++) {
  if (fileContent[i] === '[') bracketCount++;
  else if (fileContent[i] === ']') {
    bracketCount--;
    if (bracketCount === 0) {
      endPos = i;
      break;
    }
  }
}

if (endPos === -1) {
  console.error('Could not find closing bracket');
  process.exit(1);
}

const rawPropsCode = fileContent.substring(arrayContentStart, endPos);
// We want to parse individual property objects or evaluate them
// Since rawPropsCode is valid JS array literal, we can wrap it in an IIFE or module.exports
const jsCode = `module.exports = [${rawPropsCode}];`;
fs.writeFileSync('temp_props.js', jsCode);

const allProps = require('./temp_props.js');
console.log('Loaded total properties:', allProps.length);

const targetProps = allProps.slice(0, 53);

targetProps.forEach((p, index) => {
  if (index < 7) {
    p.status = 'upcoming';
  } else if (index < 20) {
    p.status = 'funded';
    p.fundedAmount = p.targetAmount;
    p.availableTokens = 0;
  } else {
    p.status = 'hidden';
  }
});

console.log('Assigned statuses:');
console.log('Upcoming:', targetProps.filter(p => p.status === 'upcoming').length);
console.log('Funded:', targetProps.filter(p => p.status === 'funded').length);
console.log('Hidden:', targetProps.filter(p => p.status === 'hidden').length);
console.log('Total:', targetProps.length);

const newRawPropsCode = JSON.stringify(targetProps, null, 2);

const newFileContent = fileContent.substring(0, arrayContentStart) + '\n' + newRawPropsCode + '\n' + fileContent.substring(endPos);

fs.writeFileSync('src/data/properties.ts', newFileContent);
fs.unlinkSync('temp_props.js');
console.log('Successfully updated src/data/properties.ts with 53 properties!');
