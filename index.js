const fs = require('fs');
const os = require('os');
const ffi = require('ffi-napi');
const ref = require('ref-napi');
const path = require('path');
const Struct = require('ref-struct-napi');
const ArrayType = require('ref-array-napi');
const iconv = require('iconv-lite');
const hardware = {};
const find = '\u0000';
const re = new RegExp(find, 'g');
const stack = require('callsite');

function hazardous(location) {
  const electronRegex = /[\\/]electron\.asar[\\/]/;
  const asarRegex = /^(?:^\\\\\?\\)?(.*\.asar)[\\/](.*)/;
  /* convert path when use electron asar unpack
   */
  if (!path.isAbsolute(location)) {
    return location;
  }

  if (electronRegex.test(location)) {
    return location;
  }

  const matches = asarRegex.exec(location);
  if (!matches || matches.length !== 3) {
    return location;
  }

  /* Skip monkey patching when an electron method is in the callstack. */
  const skip = stack().some(site => {
    const siteFile = site.getFileName();
    return /^ELECTRON_ASAR/.test(siteFile) || electronRegex.test(siteFile);
  });

  return skip ? location : location.replace(/\.asar([\\/])/, '.asar.unpacked$1');
}


const PersonInfoA = Struct({
  name: ArrayType('char', 32),
  sex: ArrayType('char', 4),
  nation: ArrayType('char', 20),
  birthday: ArrayType('char', 12),
  address: ArrayType('char', 72),
  cardId: ArrayType('char', 20),
  police: ArrayType('char', 32),
  validStart: ArrayType('char', 12),
  validEnd: ArrayType('char', 12),
  sexCode: ArrayType('char', 4),
  nationCode: ArrayType('char', 4),
  appendMsg: ArrayType('char', 72),
});
const libcvr = ffi.Library(hazardous(path.join(__dirname, './lib/sdtapi')), {
  SDT_OpenPort: [ 'int', [ 'int' ]],
  SDT_ClosePort: [ 'int', [ 'int' ]],
  SDT_StartFindIDCard: [ 'int', [ 'int','pointer','int' ]],
  SDT_SelectIDCard: [ 'int', [ 'int','pointer','int' ]],
  SDT_ReadBaseMsg: [ 'int', [ 'int','pointer','pointer','pointer','pointer','int' ]],
});

hardware.SDT_OpenPort = port => {
  try {
    const handle = libcvr.SDT_OpenPort(port);
    if (handle==1) {
      return { error: -1 };
    }
    return { error: 0, data: { handle } };
  } catch (e) {
    return { error: -1 };
  }
};

hardware.SDT_ClosePort = (port) => {
  try {
    const res = libcvr.SDT_ClosePort(port);
    if (res === 144) {
      return { error: 0 };
    }
    return { error: -1 };
  } catch (e) {
    return { error: -1 };
  }
};

hardware.SDT_StartFindIDCard = (port) => {
  try {
    const pucIIN = ref.alloc(ref.types.char);
    const res = libcvr.SDT_StartFindIDCard(port,pucIIN,0);
    if (res === 159) {
      return { error: 0 };
    }
    return { error: -1 };
  } catch (e) {
    return { error: -1 };
  }
};

hardware.SDT_SelectIDCard = (port) => {
  try {
    const pucIIN = ref.alloc(ref.types.char);
    const res = libcvr.SDT_SelectIDCard(port,pucIIN,1);
    if (res === 144) {
      return { error: 0 };
    }
    return { error: -1 };
  } catch (e) {
    return { error: -1 };
  }
};

hardware.SDT_ReadBaseMsg = (port) => {
  try {
    const pucCHMsg = ref.alloc(ArrayType('char', 1023));
    const puiCHMsgLen = ref.alloc(ref.types.int);
    const pucPHMsg = ref.alloc(ArrayType('char', 1023));
    const pucPHMsgLen = ref.alloc(ref.types.int);
    const res = libcvr.SDT_ReadBaseMsg(port,pucCHMsg,puiCHMsgLen,pucPHMsg,pucPHMsgLen,0);
    if (res === 144) {
      const msg = iconv.decode(Buffer.from(pucCHMsg), 'UCS-2');
      return { error: 0, data: {
        name: msg.slice(0,15).trim(),
        sex:msg.slice(15,16).trim(),
        nation: msg.slice(16,18).trim(),
        birthday: msg.slice(18,26).trim(),
        address: msg.slice(26,61).trim(),
        cardId: msg.slice(61,79).trim(),
        police:msg.slice(79,94).trim(),
        validStart: msg.slice(94,102).trim(),
        validEnd: msg.slice(102,110).trim(),
        // sexCode: iconv.decode(Buffer.from(personInfo.sexCode), 'gbk').replace(re, '').trim(),
        // nationCode: iconv.decode(Buffer.from(personInfo.nationCode), 'gbk').replace(re, '').trim(),
        // appendMsg: iconv.decode(Buffer.from(personInfo.appendMsg), 'gbk').replace(re, '').trim(),
        // image,
      } };
    }
    return { error: -1 };
  } catch (e) {
    return { error: -1 };
  }
};





module.exports = hardware;
