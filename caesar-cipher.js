const { program } = require('commander');
const { pipeline, Transform } = require('stream');
const fs = require('fs');
const readline = require('readline');
const path = require('path')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

program
  .option('-s, --shift <type>', 'a shift')
  .option('-a, --action <type>', 'an action encode/decode')
  .option('-i, --input <type>', 'an input file', 'none')
  .option('-o, --output <type>', 'an output file', 'none');  

program.parse(process.argv);
const options = program.opts();

if (options.shift === undefined || isNaN(Number(options.shift))) {
  process.stderr.write('not available "shift"');
  process.exit(-1);
};

if (options.action !== 'encode' && options.action !== 'decode') {
  process.stderr.write('not available "action"');
  process.exit(-1);
}

if (options.action === 'decode' ) {
  options.shift = options.shift * (-1);
};

if (options.shift >= 26) {
  options.shift = options.shift - 26 * Math.floor(options.shift / 26);
}

if (options.shift <= -26) {
  options.shift = options.shift + 26 * Math.floor(options.shift / -26);
}

const checkInputFile = async () => {
  return fs.promises.access(options.input, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false)
}

const checkOutputFile = async () => {
  return fs.promises.access(options.output, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false)
}

const transformStream = new Transform ({
  transform(chunk, encoding, callback) {
    this.push(codeAction(chunk.toString(), options.shift));
    callback();
  }
  
});

const run = async () => {
  const isInputExist = await checkInputFile();
  const isOutputExist = await checkOutputFile(); 

  if ((options.input !== 'none' && !isInputExist) || (options.output !== 'none' && !isOutputExist)) {
    process.stderr.write('paths are incorrect');
    process.exit(-1);
  };  
  
  if (isInputExist && isOutputExist) {    
    pipeline(
      fs.createReadStream(options.input, "utf8"),
      transformStream,
      fs.createWriteStream(options.output, {flags: 'a', 'encoding': null, 'mode': 0666}),
      (err) => {
        if (err) {
          process.stderr.write('something went wrong...');
        } else {
          fs.appendFile(options.output, '\n', ()=>{
            process.exit(-1);
          });          
        };
      }
    );  

    return;
  };

  if (options.input === 'none' && options.output === 'none') {
    rl.on('line', function(line) {
      rl.output.write(codeAction(line, options.shift));
    })
    return;
  }
  
  if (options.input === 'none' && isOutputExist) {
    const writeStream = fs.createWriteStream(options.output);
    rl.on('line', function(line) {
      writeStream.write(codeAction(line + '\n', options.shift));     
    });
    return;
  }

  if (isInputExist && options.output === 'none') {
    const readableStream = fs.createReadStream(options.input, "utf8"); 
    readableStream.on("data", function(chunk) {
      rl.output.write(codeAction(chunk.toString() + '\n', options.shift));
      process.exit(-1);
    });
    
    return;
  }
  
  return;
}

run();

function codeAction(msg, shift) {
  const arrInput = msg.split('');
  const shiftedInput = arrInput.map(item=>{
    if (item.codePointAt(0) < 65 || (item.codePointAt(0) > 90 && item.codePointAt(0) < 97) || item.codePointAt(0) > 122) {
      return item;
    };

    let index = item.codePointAt(0) + Number(shift);

    if (item.codePointAt(0) >= 65 && item.codePointAt(0) <= 90) {
      if (index < 65) {
        return String.fromCodePoint(index + 26);
      };

      if (index > 90) {
        return String.fromCodePoint(index - 26);
      };    
    };

    if (item.codePointAt(0) >= 97 && item.codePointAt(0) <= 122) {
      if (index < 97) {
        return String.fromCodePoint(index + 26);
      };

      if (index > 122) {
        return String.fromCodePoint(index - 26);
      };       
    };    

    return String.fromCodePoint(index);
  });

  return shiftedInput.join('');
}